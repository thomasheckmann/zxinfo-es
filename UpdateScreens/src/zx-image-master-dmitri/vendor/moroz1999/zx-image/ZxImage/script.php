<?php

//include_once('Converter.php');
include_once('../../../../vendor/autoload.php');

$converter = new \ZxImage\Converter();
$converter->setType('ssx');
$converter->setPath('example.ssx'); //
$converter->setBorder(5); //cyan
$converter->setZoom(1); //1 for 320*240 (256*192 with border)

//convert and return image data
if ($binary = $converter->getBinary()) {
    //after conversion we can ask for a mime type of last operation and send it to browser
    if ($imageType = $converter->getResultMime()) {
        header('Content-Type: ' . $imageType);
    }

    //send image contents to browser
    echo $binary;
} else {
 echo "err Class not found";
}      

?>
