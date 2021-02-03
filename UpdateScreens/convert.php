<?php
if (is_file('src/zx-image-master-dmitri/vendor/autoload.php')) {
    include_once('src/zx-image-master-dmitri/vendor/autoload.php');
}
error_reporting(0);

$asset_path = '/Users/dkthahko/Public/git_zxinfo/assets/mirror/spectrumcomputing.co.uk';

$scr_array = array();

function convertScreen($id, $scr_file, $out_dir, $out_file, $title) {
		$object = [];

		$size = filesize($scr_file);

		$info = pathinfo($scr_file);
		$src_filename =  basename($scr_file,'.'.$info['extension']);

		$ext = $info['extension'];

		// echo "processing file: $src_filename\n";
		$scrType = 'standard';
	    if ($ext == "scr") { $scrType = 'standard'; };
		if ($ext == "ss4") { $scrType = 'sam4'; };
		if ($ext == "ssx") { $scrType = 'ssx'; };
		if ($ext == "ifl") { $scrType = 'multicolor';};
		if ($ext == "mlt") { $scrType = 'mlt'; }; //not correct mode but at least we get an image
		if (($ext == "scr") && (filesize($scr_file) >=12000) ) { $scrType = 'timexhr';};

		if (strpos($out_file, '-load') !== false) {
			$type = 'Loading screen';
			$format = 'Picture';
		} else if (strpos($out_file, '-run') !== false) {
			$type = 'Running screen';
			$format = 'Picture';
		}

		$converter = new \ZxImage\Converter();
		$converter->setType($scrType);
		$converter->setPath($scr_file);

		if ($binary = $converter->getBinary()) {
		    //after conversion we can ask for a mime type of last operation and send it to browser
		    $imageType = $converter->getResultMime();
		    $outdir_converted = substr($out_dir, 1);
		    switch($imageType) {
		    	case 'image/png':
		    		$outfile_converted = $outdir_converted . $out_file . ".png";
				    $newfilename = $out_file . ".png";
		    		break;
		    	case 'image/gif':
				    $outfile_converted =  $outdir_converted . $out_file . ".gif";
				    $newfilename = $out_file . ".gif";
		    		break;
		    	default:
		    		echo "unkown format: $imageType\n";
		    		break;
		    }

		    // echo "converting $src_filename to $outdir_converted";
			if (!is_dir($outdir_converted)) {
				// dir doesn't exist, make it
				mkdir($outdir_converted, 0777, true);
			}
			file_put_contents($outfile_converted, $binary);
			$newfilesize = filesize($outfile_converted);
			echo "$out_file, size: $newfilesize($size, $scrType)\n";
			$object = (object) ['filename' => $newfilename, 'url' => '/' . $outfile_converted, 'size' => $newfilesize, 'type' => $type, 'format' => $format, 'title' => $title];
		} else {
			echo "HUH!?!?!";
		}
		return $object;
}



$delimiter = "\t";

$fp = fopen('../zxscreens.txt', 'r');

/*

 Loop through list of screens identified by create json documents

 */
while ( !feof($fp) )
{
    $line = fgets($fp, 2048);

    $data = str_getcsv($line, $delimiter);

    $screen_type = $data[0];
    $id = $data[1];
    $from_url = $data[2];
    $to_path = $data[3];
    $to_filename = $data[4];
    $title = $data[5];

    if($screen_type == 'load' || $screen_type == 'run') {
    	$object;
		$fullpath = $asset_path.$from_url;

		if(!is_file($fullpath)) {
	    	echo "[NOT FOUND]" . $to_path . $to_filename . $ext . "\n";
		} else if (filesize($fullpath) < 6912) {
	    	echo "[TO SMALL?]" . $to_path . $to_filename . $ext . "\n";
		} else if(file_exists("." . $to_path . $to_filename . ".gif") || file_exists("." . $to_path . $to_filename . ".png")) {

	    	// gif or png?
	    	$ext = "";
	    	if(file_exists("." . $to_path . $to_filename . ".gif")) {
		    	$ext = ".gif";
	    	}
	    	if(file_exists("." . $to_path . $to_filename . ".png")) {
		    	$ext = ".png";
	    	}
	    	echo "[EXISTS]" . $to_path . $to_filename . $ext . "\n";
	    	$newfilename = $to_filename . $ext;
	    	$outfile_converted = $to_path . $to_filename . $ext;

			if ($screen_type == 'load') {
				$type = 'Loading screen';
				$format = 'Picture';
			} else if ($screen_type == 'run') {
				$type = 'Running screen';
				$format = 'Picture';
			}
			$newfilesize = filesize("." . $to_path . $to_filename . $ext);

			$object = (object) ['filename' => $newfilename, 'url' => $outfile_converted, 'size' => $newfilesize, 'type' => $type, 'format' => $format, 'title' => $title];
    	} else {
	    	echo "[CONVERT]" . $to_path . $to_filename . "\n";
	    	$object = convertScreen($id, $fullpath, $to_path, $to_filename, $title);

    	}
		if(is_null($scr_array[$id])) {
			$scr_array[$id] = array();
		}
		array_push($scr_array[$id], $object);
	}
}                              
fclose($fp);

/*

 Update "screens" section for json documents

 */
foreach ($scr_array as $key => $items) {
	$json_file = str_pad($key, 7, '0', STR_PAD_LEFT) . ".json";
	$json_items = json_encode($items, JSON_UNESCAPED_SLASHES);
	$json_str = "{ \"screens\": $json_items }";

	// echo "$json_file => $json_str\n";

	file_put_contents("../data/screens/" . $json_file, $json_str);

}

?>
