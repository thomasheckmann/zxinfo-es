# Installation
To update with new screens from ZXDB:

* Copy 'src' from [zx-image](https://github.com/moroz1999/zx-image) to 'src' folder. Needed to convert .scr/.ifl to .png or .gif

* Copy 'src/GifCreator' from [GifCretor](https://github.com/moroz1999/GifCreator) to 'src'

* 'src' should now contain two directories: 'GifCreator' and 'ZxImage'

* Run the script 'getscreen.sh' to copy screens from 'new' structure to 'mirror'

* Run the PHP program 'convert.php' to convert all screens to .png or .gif and generate extra json. Output:
	* images(png/gif) goes to directory 'new'
	* extra json (additionals) goes to directory 'json'

* update JSON in Elasticsearh by running node program
````
> node update-new-screens.js UpdateScreens/json/
````

# Changelog
## 05-2017
* Changed mapping - feature to nested object