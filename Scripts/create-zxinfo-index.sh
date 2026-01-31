#!/bin/sh
if [ -z "${ES_HOST}" ];
then
ES_HOST=http://localhost:9200
fi

INDEX_NAME="zxinfo"
WRITE_INDEX=`date "+${INDEX_NAME}-%Y%m%d-%H%M%S"`
WRITE_ALIAS="${INDEX_NAME}_games_write"

echo $(date) 'Elasticsearch host: ' $ES_HOST
echo -e $(date) '\tIndex\t: ' $INDEX_NAME
echo -e $(date) '\tWrite index\t: ' $WRITE_INDEX
echo -e $(date) '\tWrite alias\t: ' ${WRITE_ALIAS}

echo $(date) "-- creating Elasticsearch index for zxinforch: ${WRITE_INDEX}"
curl -X PUT "${ES_HOST}/${WRITE_INDEX}" -H 'Content-Type: application/json' -d '@mappings/games-mapping.json'

echo $(date) '-- remove alias ' $WRITE_ALIAS from all index
curl -H'Content-Type: application/json' -XPOST "${ES_HOST}/_aliases" -d '
{
    "actions" : [
        { "remove" : { "index" : "*", "alias" : "'$WRITE_ALIAS'" } }
    ]
}'; echo ""

echo $(date) '-- create new write alias ' $WRITE_ALIAS ' for index ' $WRITE_INDEX
curl -H'Content-Type: application/json' -XPOST "${ES_HOST}/_aliases" -d '
{   
    "actions" : [
        { "add" : { "index" : "'$WRITE_INDEX'", "alias" : "'$WRITE_ALIAS'" } }
    ]
}'; echo ""

echo 'NEW INDEX             : ' ${WRITE_INDEX}
echo 'NEW WRITE ALIAS       : ' ${WRITE_ALIAS}
