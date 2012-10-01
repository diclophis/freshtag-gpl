#!/usr/bin/env ruby

require "opentok"
require "rack/contrib"

$build = "1.1"

class TokBoxMiddleware
  @@api_key = "20179871"
  @@api_secret = "120b9dcb30d979f5dde64625e053186524f4aefa"
  @@api_url = "https://api.opentok.com/hl"

  def self.session
    opentok = ::OpenTok::OpenTokSDK.new @@api_key, @@api_secret
    session_id = opentok.create_session
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
      #env['HTTP_IF_NONE_MATCH'] = $build + request.url
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

use Rack::ConditionalGet

use Rack::ShowExceptions

use Rack::Deflater

use Rack::Static,
  :urls => ["/javascripts", "/images", "/stylesheets", "/favicon.ico"],
  :cache_control => 'public, max-age=500',
  :root => "public"

default_resource = Proc.new { |env|
  [ 
    200,
    {
      'Content-Type' => "text/html",
      "Connection" => "keep-alive",
      "Cache-Control" => "public, must-revalidate, max-age=500",
      "ETag" => $build
    },
    File.open("public/index.html")
  ]
}

builder = Rack::Builder.new do
  map "/" do
    run default_resource
  end

  map "/api/token" do
    run Proc.new { |env| [
      200,
      {
        'Content-Type' => "text/plain",
        "Cache-Control" => "public, must-revalidate, max-age=0"
      },
      TokBoxMiddleware.token(env)
    ]}
  end

  map "/api/session" do
    run Proc.new {[
      200,
      {
        'Content-Type' => "text/plain",
        "Cache-Control" => "public, must-revalidate, max-age=0"
      },
      TokBoxMiddleware.session
    ]}
  end
end

run builder
