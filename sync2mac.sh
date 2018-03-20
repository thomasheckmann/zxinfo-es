#!/bin/bash
#
# Using Rsync and SSH
# http://troy.jdmz.net/rsync/index.html
#
# How to Setup Rsync with SSH on UNIX / Linux (rsync without password)
# https://www.thegeekstuff.com/2011/07/rsync-over-ssh-without-password/
#
# ssh-keygen -t rsa -b 2048 -f ~/.ssh/thishost-rsync-key
# ssh-copy-id -i ~/.ssh/thishost-rsync-key.pub kolbeck@thomas.kolbeck.dk
# (test) ssh -i ~/.ssh/thishost-rsync-key kolbeck@thomas.kolbeck.dk
#

#rsync -avz data -e 'ssh -i ~/.ssh/thishost-rsync-key' kolbeck@thomas.kolbeck.dk:/Users/kolbeck/git/zxinfo-es
#rsync -avz UpdateScreens/json -e 'ssh -i ~/.ssh/thishost-rsync-key' kolbeck@thomas.kolbeck.dk:/Users/kolbeck/git/zxinfo-es/UpdateScreens

rsync -avz UpdateScreens/zxdb -e 'ssh -i ~/.ssh/thishost-rsync-key' kolbeck@thomas.kolbeck.dk:/www/sinclair/media
rsync -avz UpdateScreens/zxscreens -e 'ssh -i ~/.ssh/thishost-rsync-key' kolbeck@thomas.kolbeck.dk:/www/sinclair/media
