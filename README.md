# For Gunjan, with love

An interactive birthday surprise for **12 January 2027**, following the supplied video. Open `index.html` in a browser to play. It works immediately, including before her birthday. No build or account is required.

Pull and release the bow (or tap the heart), open the present, explore the album, and knock three times to enter the museum. Inside are a scratch-off gallery, a nine-piece photo puzzle, a sealed birthday letter with a voice note, and five promises to sign. “Lovers” by Anna of the North starts when the site opens, or on the first tap if the browser requires one. The corner button shows moving bars during playback and lets the visitor pause or resume the song. The song pauses during the birthday voice note and resumes when it finishes.

## Add your photos

Replace `assets/photos/01.jpg` through `assets/photos/08.jpg` with your own JPEG photos, keeping the filenames. Square crops work well. The scratch gallery uses all eight images. The Polaroid album uses the portraits in `assets/album/`. Each entry in `albumPhotos` in `birthday.js` sets the focal point and zoom for its frame. The puzzle uses `assets/puzzle-hug.jpg`. Its tiles and peek preview share the focal point set on `.puzzle-frame` in `style.css`. Update the eight captions at the top of `birthday.js` if desired.

The prototype uses original illustrated artwork, sample still-life photographs, and a synthesized birthday note. To use your own voice, replace `assets/birthday-note.mp3`. The letter is in `index.html`.
