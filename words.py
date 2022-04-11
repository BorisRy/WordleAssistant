

f = open('words.txt')
words_dirty = f.read().split("<br>")
words = []

for word in words_dirty:
    words.append(word[-5:])

print(words)