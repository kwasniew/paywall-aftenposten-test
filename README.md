#Paywall

Used by core application

[![IVY Engine - Digital storytelling](http://static.agens.no/images/ivy_digital_storytelling_small.png)](http://ivyengine.com/)


## SASS/CSS
### Making changes
In order to make changes, you absolutely must do them in the `.scss` source files. Grunt will then [compile](#compiling) them into normal `.css`.There is a [Grunt](http://gruntjs.com/) `watch` task in this project that will automate this for you.

### Compiling
If you’re unfamiliar with Grunt, read the [Getting started](http://gruntjs.com/getting-started) guide.
Then navigate to the project folder in your terminal:
* Install Grunt dependencies: `npm install`
* Run the automated compiler: `grunt watch`

This will continuously watch for changes in the `.scss` files. Once a change is detected, it will compile the SASS and update the `admin-interface.css` file which is already referenced in the HTML.

#### Stuff you don’t have to worry about

##### Vendor prefixing
[grunt-autoprefixer](https://github.com/nDmitry/grunt-autoprefixer) does this for you, based on [caniuse.com](http://caniuse.com/)’s extensive data sets

##### Graphics optimization & inlining
[grunt-contrib-imagemin](https://github.com/gruntjs/grunt-contrib-imagemin) takes care of minimizing file sizes, while [grunt-image-embed](https://github.com/ehynds/grunt-image-embed) helps us speed up the paywall by putting the optimized graphics into the CSS as base64-encoded data URI strings, which reduces the number of requests made to the server

##### Optimizing @media queries
Write them in-context (nested), and have [grunt-combine-media-queries](https://github.com/buildingblocks/grunt-combine-media-queries) combine matching blocks to reduce the load on the client