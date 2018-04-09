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

# sync to Hetzner ZXINFO.dk
echo "TRANSFER EXPORT FILES TO HOST: http://195.201.118.208/"
rsync -avz zxscreens -e 'ssh -i ~/.ssh/thishost-rsync-key' kolbeck@zxinfo.dk:/www/sinclair/media
