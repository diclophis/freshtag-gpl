#!/usr/bin/env ruby

require "opentok"
require "rack/contrib"

class TokBoxMiddleware

  @@location = "freshtag.me"
  @@api_key = "20179871"
  @@api_secret = "120b9dcb30d979f5dde64625e053186524f4aefa"
  @@api_url = "https://api.opentok.com/hl"

  def self.session
    opentok = ::OpenTok::OpenTokSDK.new @@api_key, @@api_secret
    session_id = opentok.create_session
    #@@location
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


use Rack::ShowExceptions

#use Rack::StaticCache,
use Rack::Static,
  :urls => ["/javascripts", "/images", "/stylesheets"],
  :cache_control => 'public, must-revalidate, max-age=0, no-cache',
  :root => "public"

default_resource = Proc.new { |env|
  [ 
    200,
    {
      'Content-Type' => "text/html",
      "Cache-Control" => "public, must-revalidate, max-age=0"
    },
    File.open("public/index.html")
  ]
}

builder = Rack::Builder.new do
  map "/" do
    run default_resource
  end

  map "/token" do
    run Proc.new { |env| [
      200,
      {
        'Content-Type' => "text/plain",
        "Cache-Control" => "public, must-revalidate, max-age=0"
      },
      TokBoxMiddleware.token(env)
    ]}
  end

  map "/session" do
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
