I want to expand the BMP export portion of this application.

I want the Export as BMP button to trigger a simple modal that provides the following options:

### Format

A drop down that lets the user select from the following options:

* Jpeg
* PNG
* BMP
* TGA

### Resolution

I want to provide the user the option to either keep the resolution as-is or to select an option to provide the longest size in pixels

### Compression

I want a text field that lets users select a number between 1 and 100 for compression. This option should only be enabled if Jpeg or PNG are selected.

Once the OK button is clicked, it should trigger a function that has the following values as arguments:

* A Blob representing the BMP file data exported from the WebGLImageViewer instance
* Image format
* Image resolution options
* Compression option (or undefined if not jpeg or png)

Produce the function, but do not implement it.