#!/bin/bash

TO_EXPORT="all"
FILES_TO_EXPORT="import_zxinfo.sh import_magazines.sh elasticdump"

while [[ $# -gt 0 ]]
do
key="$1"

case $key in
    -g|--games)
    TO_EXPORT="games"
    shift # past argument
    ;;
    -m|--magazines)
    TO_EXPORT="magazines"
    shift # past argument
    ;;
    *)    # unknown option
    shift # past argument
    ;;
esac
done

echo "########### EXPORTING ZXINFO ###############"

if [ $TO_EXPORT == 'all' ]
then
    echo "EXPORT ALL (zxinfo-games, zxinfo_magazines)"
elif [ $TO_EXPORT == 'games' ]
then
    echo "EXPORT zxinfo-games"
elif [ $TO_EXPORT == 'magazines' ]
then
    echo "EXPORT zxinfo-magazines"
else
    echo "Unknown data to export: $TO_EXPORT !!!!"
    exit
fi

if [ $TO_EXPORT == 'all' ]||[ $TO_EXPORT == 'games' ]
then
    # clean-up
    rm -f zxinfo_games.analyzers.txt zxinfo_games.index.txt zxinfo_games.mappings.txt

    echo "DUMPING zxinfo_games DATA"
    ./elasticdump/bin/elasticdump \
      --input=http://localhost:9200/zxinfo_games \
      --output=zxinfo_games.index.txt \
      --type=data \
      --headers='{"Content-Type": "application/json"}'

    echo "DUMPING zxinfo_games MAPPINGS"
    ./elasticdump/bin/elasticdump \
      --input=http://localhost:9200/zxinfo_games \
      --output=zxinfo_games.mappings.txt \
      --type=mapping \
      --headers='{"Content-Type": "application/json"}'

    echo "DUMPING zxinfo_games ANALYZERS"
    ./elasticdump/bin/elasticdump \
      --input=http://localhost:9200/zxinfo_games \
      --output=zxinfo_games.analyzers.txt \
      --type=analyzer \
      --headers='{"Content-Type": "application/json"}'
      
    FILES_TO_EXPORT+=" zxinfo_games.index.txt zxinfo_games.mappings.txt zxinfo_games.analyzers.txt"
fi

if [ $TO_EXPORT == 'all' ]||[ $TO_EXPORT == 'magazines' ]
then
    # clean-up
    rm -f zxinfo_magazines.index.txt zxinfo_magazines.mappings.txt

    echo "DUMPING zxinfo_magazines DATA"
    ./elasticdump/bin/elasticdump \
      --input=http://localhost:9200/zxinfo_magazines \
      --output=zxinfo_magazines.index.txt \
      --type=data \
      --headers='{"Content-Type": "application/json"}'

    echo "DUMPING zxinfo_magazines MAPPINGS"
    ./elasticdump/bin/elasticdump \
      --input=http://localhost:9200/zxinfo_magazines \
      --output=zxinfo_magazines.mappings.txt \
      --type=mapping \
      --headers='{"Content-Type": "application/json"}'
      
    FILES_TO_EXPORT+=" zxinfo_magazines.index.txt zxinfo_magazines.mappings.txt"
fi

echo "TRANSFER EXPORT FILES TO HOST: 135.181.195.52"
rsync -avz $FILES_TO_EXPORT -e 'ssh -i ~/.ssh/thishost-rsync-key' kolbeck@135.181.195.52:/home/kolbeck/git/zxinfo-es/scripts/transfer/

