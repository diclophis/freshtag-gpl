#!/usr/bin/env ruby

require "opentok"
require "rack/contrib"
require "newrelic_rpm"
require 'new_relic/rack/developer_mode'

$build = "1.2"

class TokBoxMiddleware
  @@api_key = "20179871"
  @@api_secret = "120b9dcb30d979f5dde64625e053186524f4aefa"
  @@api_url = "https://api.opentok.com/hl"

  def self.session(webrtc = false)
    opentok = ::OpenTok::OpenTokSDK.new @@api_key, @@api_secret
    sessionProperties = {}
    if webrtc
      sessionProperties = {OpenTok::SessionPropertyConstants::P2P_PREFERENCE => "enabled"}
    end
    session_id = opentok.create_session(nil, sessionProperties)
    StringIO.new(session_id.to_s)
  end

  def self.token(env)
    req = Rack::Request.new(env)
    session = req.params["session"]
    opentok = ::OpenTok::OpenTokSDK.new @@api_key, @@api_secret
    token_id = opentok.generate_token :session_id => session
    StringIO.new(token_id)
  end
end

module Rack
  class TripleDubRedirect
    def initialize(app)
      @app = app
    end

    def call(env)
      request = Rack::Request.new(env)
      if request.host.start_with?("www.")
        [301, {
          'Content-Type' => "text/plain",
          "Location" => request.url.sub("//www.", "//")
        }, self]
      else
        @app.call(env)
      end
    end

    def each(&block)
    end
  end
end

use Rack::TripleDubRedirect

use Rack::ShowExceptions

use Rack::Deflater

use Rack::Static,
  :urls => ["/javascripts", "/images", "/stylesheets", "/favicon.ico"],
  :cache_control => 'public, must-revalidate, max-age=500',
  :root => "public"

#use NewRelic::Rack::DeveloperMode

NewRelic::Agent.manual_start

class FreshTagResource
  def text_headers(type)
  {
    "Content-Type" => "text/" + type,
    "Cache-Control" => "public, must-revalidate, max-age=0"
  }
  end
end

class DefaultResource < FreshTagResource
  PUBLIC_INDEX = File.open("public/index.html").readlines.join("\n")
  def call(env)
  [
    200,
    text_headers("html"),
    PUBLIC_INDEX
  ]
  end
  include NewRelic::Agent::Instrumentation::Rack
end

class TokenResource < FreshTagResource
  def call(env)
  [
    200,
    text_headers("plain"),
    TokBoxMiddleware.token(env)
  ]
  end
  include NewRelic::Agent::Instrumentation::Rack
end

class SessionResource < FreshTagResource
  def call(env)
  [
    200,
    text_headers("plain"),
    TokBoxMiddleware.session
  ]
  end
  include NewRelic::Agent::Instrumentation::Rack
end

builder = Rack::Builder.new do
  map "/" do
    run DefaultResource.new
  end

  map "/api/token" do
    run TokenResource.new
  end

  map "/api/session" do
    run SessionResource.new
  end
end

run builder
