#!/bin/bash
source ../scripts/settings.sh

WRITE_INDEX=`date "+zxinfo-%Y%m%d-%H%M%S"`
WRITE_ALIAS="${GAMES_INDEX}_write"

echo 'Elasticsearch host: ' $ES_HOST
echo 'Elasticsearch port: ' $ES_PORT
echo 'Index/Type        : ' $GAMES_INDEX/$GAMES_TYPE
echo 'Index             : ' ${WRITE_INDEX}
echo 'Index_alias       : ' ${WRITE_ALIAS}
echo 'Suggest index 	: ' $SUGGESTS_INDEX/$SUGGESTS_TYPE

## ZXINFO
echo '-- create ' $WRITE_INDEX/$GAMES_TYPE
elasticdump \
  --input=zxinfo_games.mappings.txt \
  --output=http://localhost:9200/${WRITE_INDEX} \
  --type=mapping

echo '-- remove all alias for ' $WRITE_ALIAS
curl -XPOST "http://${ES_HOST}:${ES_PORT}/_aliases" -d '
{
    "actions" : [
        { "remove" : { "index" : "*", "alias" : "'$WRITE_ALIAS'" } }
    ]
}'; echo ""

echo '-- create alias ' $WRITE_ALIAS ' for index ' $WRITE_INDEX
curl -XPOST "http://${ES_HOST}:${ES_PORT}/_aliases" -d '
{
    "actions" : [
        { "add" : { "index" : "'$WRITE_INDEX'", "alias" : "'$WRITE_ALIAS'" } }
    ]
}'; echo ""

echo '-- importing data into ' $WRITE_ALIAS
elasticdump \
  --input=zxinfo_games.index.txt \
  --output=http://localhost:9200/${WRITE_ALIAS} \
  --type=data

## TITLE SUGGESTER
echo '-- delete ' $SUGGESTS_INDEX/$SUGGESTS_TYPE
curl -XDELETE "http://${ES_HOST}:${ES_PORT}/${SUGGESTS_INDEX}"; echo ""

echo '-- create ' $SUGGESTS_INDEX/$SUGGESTS_TYPE
elasticdump \
  --input=zxinfo_suggests.mappings.txt \
  --output=http://localhost:9200/${SUGGESTS_INDEX} \
  --type=mapping

echo '-- importing data into ' $SUGGESTS_INDEX
elasticdump \
  --input=zxinfo_suggests.index.txt \
  --output=http://localhost:9200/${SUGGESTS_INDEX} \
  --type=data

## wait
read -n1 -r -p "Press space to swith to new index..." key

echo '-- remove all alias for ' ${GAMES_INDEX}
curl -XPOST "http://${ES_HOST}:${ES_PORT}/_aliases" -d '
{
    "actions" : [
        { "remove" : { "index" : "*", "alias" : "'${GAMES_INDEX}'" } }
    ]
}'; echo ""

echo "Switching to new INDEX ${WRITE_INDEX} for ALIAS ${GAMES_INDEX}"
curl -XPOST "http://${ES_HOST}:${ES_PORT}/_aliases" -d '
{
    "actions" : [
        { "add" : { "index" : "'$WRITE_INDEX'", "alias" : "'$GAMES_INDEX'" } }
    ]
}'
