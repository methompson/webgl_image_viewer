I want to create an application that uses WebGL to open an image.
I want the image to be displayed in a WebGL canvas.

I want to use this application to modify the image in separate ways:
* Resize/Desqueeze an anamoprhic image
* Adjust lens distortion

I want to export the image after the image has been adjusted. The image can be low-complexity uncompressed image, like bmp or tga.

### Loading the image

The image should be displayed normally. Not flipped, rotated or mirrored.

### I want to resize the image

I want to be able to "desqueeze" the image using an anamorphic "squeeze ratio" value that resizes the image vertically, while maintaing the horizontal width.

The number in the squeeze ratio should represent the anamorphic lens's squeeze ratio. For instance, if I shoot a picture with a lens that has a 1.6x squeeze, I want to be able to set the slider to 1.6 to unsqueeze the image based on the lens's squeeze factor

### I want to correct lens distortion

I want to be able to correct lens barrel and pincushion distortion in the image
I also want an option that "zooms" into the image when distortion correction is used to prevent the corners from being black.

The project is currently set up to use vite to run the application.

I want the UI for both sliders to change so that I can type numbers in as well as using the slider.