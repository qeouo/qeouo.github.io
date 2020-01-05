#!/bin/sh

 ~/blender -b ./floor.blend -S Scene -o //# -F PNG -f 0
 ~/blender -b ./floor.blend -S Scene -o //# -F PNG -f 1
 ~/blender -b ./floor.blend -S Scene -o //# -F PNG -f 2
 ~/blender -b ./floor.blend -S Scene -o //# -F PNG -f 3
 ~/blender -b ./floor.blend -S Scene -o //# -F PNG -f 4
 ~/blender -b ./floor.blend -S Scene -o //# -F PNG -f 5

convert +append 0.png 1.png 2.png 3.png 0123.png
convert +append 4.png 5.png  45.png
convert -append 0123.png  45.png 012345.png
 
rm 0.png 1.png 2.png 3.png 4.png 5.png 0123.png 45.png

