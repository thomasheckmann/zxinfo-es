#!/bin/bash

#
# ES_PORT=<port> ES_HOST=<host> ./import_zxinfo.sh
#

if [ -z "${ES_HOST}" ];
then
ES_HOST=localhost
fi

if [ -z "${ES_PORT}" ];
then
ES_PORT=9200
fi


GAMES_INDEX=zxinfo_games

MAGAZINES_INDEX=zxinfo_magazines
MAGAZINES_TYPE=zxinfo_magazines

WRITE_INDEX=`date "+zxinfo-%Y%m%d-%H%M%S"`
WRITE_ALIAS="${GAMES_INDEX}_write"

echo 'Elasticsearch host: ' $ES_HOST
echo 'Elasticsearch port: ' $ES_PORT
echo 'Index/Type        : ' $GAMES_INDEX
echo 'Index             : ' ${WRITE_INDEX}
echo 'Index_alias       : ' ${WRITE_ALIAS}


## ZXINFO
echo '-- create ' $WRITE_INDEX
./elasticdump/bin/elasticdump \
  --input=zxinfo_games.analyzers.txt \
  --output=http://${ES_HOST}:${ES_PORT}/${WRITE_INDEX} \
  --type=analyzer \
  --headers='{"Content-Type": "application/json"}'

./elasticdump/bin/elasticdump \
  --input=zxinfo_games.mappings.txt \
  --output=http://${ES_HOST}:${ES_PORT}/${WRITE_INDEX} \
  --type=mapping \
  --headers='{"Content-Type": "application/json"}'


echo '-- remove all alias for ' $WRITE_ALIAS
curl -H'Content-Type: application/json' -XPOST "http://${ES_HOST}:${ES_PORT}/_aliases" -d '
{
    "actions" : [
        { "remove" : { "index" : "*", "alias" : "'$WRITE_ALIAS'" } }
    ]
}'; echo ""

echo '-- create alias ' $WRITE_ALIAS ' for index ' $WRITE_INDEX
curl -H'Content-Type: application/json' -XPOST "http://${ES_HOST}:${ES_PORT}/_aliases" -d '
{
    "actions" : [
        { "add" : { "index" : "'$WRITE_INDEX'", "alias" : "'$WRITE_ALIAS'" } }
    ]
}'; echo ""

echo '-- importing data into ' $WRITE_ALIAS
./elasticdump/bin/elasticdump \
  --input=zxinfo_games.index.txt \
  --output=http://${ES_HOST}:${ES_PORT}/${WRITE_ALIAS} \
  --type=data \
  --headers='{"Content-Type": "application/json"}'


## wait
read -n1 -r -p "Press space to swith to new index..." key

echo '-- remove all alias for ' ${GAMES_INDEX}
curl -H'Content-Type: application/json' -XPOST "http://${ES_HOST}:${ES_PORT}/_aliases" -d '
{
    "actions" : [
        { "remove" : { "index" : "*", "alias" : "'${GAMES_INDEX}'" } }
    ]
}'; echo ""

echo "Switching to new INDEX ${WRITE_INDEX} for ALIAS ${GAMES_INDEX}"
curl -H'Content-Type: application/json' -XPOST "http://${ES_HOST}:${ES_PORT}/_aliases" -d '
{
    "actions" : [
        { "add" : { "index" : "'$WRITE_INDEX'", "alias" : "'$GAMES_INDEX'" } }
    ]
}'

# curl http://localhost:9200/_cat/indices?v
# curl http://localhost:9200/_cat/aliases?v
# curl http://localhost:9200/zxinfo_games/_doc/0002259
echo ""
echo "test: curl http://${ES_HOST}:${ES_PORT}/zxinfo_games/_doc/0002259 | jq"
