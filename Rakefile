
task :foo do
  File.open("public/words.txt") do |io|
    lines = io.read.split("\n")
    lines.each do |line|
      puts "<li><a data-hashtag=\"" + line + "\"></a></li>"
    end
  end
end
