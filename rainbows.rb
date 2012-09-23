#!/usr/bin/env ruby

worker_processes 1
#rewindable_input false

Rainbows! do
  use :FiberSpawn
  #keepalive_timeout 0
  worker_connections 128
  #client_max_body_size 1*1024*1024 # 1 megabyte(s)
end
