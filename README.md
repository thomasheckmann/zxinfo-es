# zxinfo-es
Create Elasticsearch instance with documents created from ZXDB.

This is the data backend for [ZXInfo App](http://zxinfo.dk) using Elasticsearch.

It is written in NodeJS and requires the following:
* Node.js
* zxinfo-db - MariaDB populated with ZXDB data - [github](https://github.com/thomasheckmann/zxinfo-services)

# Installation
To install all required modules, type
````
> npm install
````

Create Elasticsearch mappings
````
> (cd ZXInfoArchive/scripts/ && ./createGameIndex.sh)
````

Start your MariaDB with ZXDB data as described on [github](https://github.com/thomasheckmann/zxinfo-services)

Generates json documents for all releases.
````
> node create-zxinfo-documents -all
````
This command creates all JSON documents to be imported into Elasticsearch in the following directory:
* _'data/processed/json'_

If you only want to generate JSON document for a specific game, just specify the ID as parameter (instead of the -all above). For example to generate JSON document for 'Rambo' with ID=4010
````
> node create-zxinfo-documents 4010
````

After finish, import into Elasticsearch
````
> node import-into-elastic.js data/processed/json/
````
This command indexes all JSON document in the folder. It updates index 'zxinfo_index' which can be configure in the file esConfig.js

## optional - add new screenshots
Make sure you got all lates screen from http://spectrumcomputing.co.uk 
````
> cd UpdateScreens
> ./getscreens.sh
````
This command creates a mirror with screen in the directory:
* _'UpdateScreens/mirror'_

The .scr files needs to be converted to PNG (or GIF if containing FLASH) and additional info needs to be added to documents in Elasticsearch.

Convert .scr to GIF or PNG
````
> php convert.php
````
This command convert screens from scr format to png or gif and generate required JSON update files which will output to:
* _'UpdateScreens/json'_ - JSON update which must be merge with Elasticsearch documents
* _'UpdateScreens/new/sinclair/screens/load/scr/'_ - converted loading screens (GIF or PNG)
* _'UpdateScreens/new/sinclair/screens/in-game/scr/'_ - converted in-game screens (GIF or PNG)

In-game and loading screen directory structure is compatible with the use on http://spectrumcomputing.co.uk

Merge additional info with documents in Elasticsearch
````
> node update-new-screens.js UpdateScreens/json/
````

Copy converted screens to htdocs or similar accesible by web-server.
## 01-2018
* Major update of Elasticsearch from 2.4.x to 6.1.x

## 05-2017
* Updated README

## 04-2017
* Add command line options to create-zxinfo-documents to process a single game
* Added more details for each query
* Added roles to document, see e.g. gameid=26834

## 04-2017
* Download and filetype_id has changed. see [forum](https://www.worldofspectrum.org/forums/discussion/52951/database-model-zxdb/p24)
* - added as format to addtionals and downloads 

## 02-2017
* Fixed a problem with wrong publisher in 'series'
* Added Other systems info
* Added Authored/Authoring