
task :foo do
  File.open("public/words.txt") do |io|
    lines = io.read.split("\n")
    lines.each_with_index do |line, i|
      className = (i < 10) ? "show" : "hidden"
      puts "<li class=\"" + className + "\"><a data-hashtag=\"" + line + "\"></a></li>"
    end
  end
end
