# zxinfo-es
Create Elasticsearch instance with documents created from ZXDB.

This is the data backend for [ZXInfo App](http://sinclair.kolbeck.dk) using Elasticsearch.

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

Generate JSON documents, the document will be save in 'data/processed/json'
````
> node create-zxinfo-documents
````

After finish, import into Elasticsearch
````
> node import-into-elastic.js data/processed/json/
````

## optional - create title suggestions
Use this to generate documents for use with completion suggester in Elasticsearch - read more about it [on the blog](https://www.elastic.co/blog/you-complete-me). The script makes suggestions based on title and alias.

Make sure the index has been created
````
> (cd ZXInfoArchive/scripts/ && ./createSuggestersIndex.sh)
````

Generate and index documents with suggesters (to index 'zxinfo_suggests_index')
````
> node create-title-suggestions
````

## optional - add new screenshots
Make sure you got all lates screen by running

````
> cd UpdateScreens
> ./getscreens.sh
````

Convert screens from scr format to png or gif by running
````
> php convert.php
````

JSON additional for new screens are saved in folder 'json/' - needs to be merged with documents from Elasticsearch by running
````
> node update-new-screens.js UpdateScreens/json/
````

Copy converted screens to htdocs or similar

## 04-2017
* Download and filetype_id has changed. see [forum](https://www.worldofspectrum.org/forums/discussion/52951/database-model-zxdb/p24)
* - added as format to addtionals and downloads 

## 02-2017
* Fixed a problem with wrong publisher in 'series'
* Added Other systems info
* Added Authored/Authoring