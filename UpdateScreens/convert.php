<?php
if (is_file('src/zx-image-master-dmitri/vendor/autoload.php')) {
    include_once('src/zx-image-master-dmitri/vendor/autoload.php');
}
error_reporting(0);

//$asset_path = '/Users/dkthahko/Public/Sinclair/git_zxinfo/assets/mirror/spectrumcomputing.co.uk';
//$asset_path = '/Users/kolbeck/Public/ZXINFO/zxinfo-hash-check/files/spectrumcomputing.co.uk';
$asset_path = '/Users/kolbeck/Public/ZXINFO/assets/spectrumcomputing.co.uk';

$zxscreen_path = '/Users/kolbeck/Public/ZXINFO/assets';

$scr_array = array();

function convertScreen($id, $entry_id, $scr_file, $scr_path, $out_dir, $out_file, $title, $release_seq) {
		global $zxscreen_path;

		$object = [];

		$size = filesize($scr_file);

		$info = pathinfo($scr_file);
		$src_filename =  basename($scr_file,'.'.$info['extension']);

		$ext = $info['extension'];

		echo "$id: converting $src_filename\n";
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
		    $outdir_converted = $outfile_converted . substr($out_dir, 1);

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

			$zxscreen_target = $zxscreen_path.'/'.$outdir_converted;
			$zxscreen_target_file = $zxscreen_path.'/'.$outfile_converted;
			echo "$id: writing: $zxscreen_target_file ($zxscreen_target)\n";
			
		    // echo "converting $src_filename to $outdir_converted";
			if (!is_dir($zxscreen_target)) {
				// dir doesn't exist, make it
				mkdir($zxscreen_target, 0777, true);
			}
			file_put_contents($zxscreen_target_file, $binary);

			$newfilesize = filesize($zxscreen_target_file);
			echo "$id: $out_file, size: $newfilesize($size, $scrType)\n";
			$object = (object) ['entry_id' => intval($entry_id), 'release_seq' => $release_seq, 'filename' => $newfilename, 'url' => '/' . $outfile_converted, 'scrUrl' => $scr_path, 'size' => $newfilesize, 'type' => $type, 'format' => $format, 'title' => $title];
		} else {
			echo "$id: [UNKNOWN HANDLING]\n";
		}
		return $object;
}



$delimiter = "\t";

$zxscreen_file = '../zxscreens.txt';
echo "opening file: $zxscreen_file\n";
$fp = fopen($zxscreen_file, 'r');

/*

 Loop through list of screens identified by create json documents

 */
while ( !feof($fp) )
{
    $line = fgets($fp, 2048);
    echo "processing $line";

    $data = str_getcsv($line, $delimiter);

    $screen_type = $data[0];
	$release_seq = $data[1];
    $id = $data[2];
	$entry_id = $data[3];
    $from_url = $data[4];
    $to_path = $data[5];
    $to_filename = $data[6];
    $title = $data[7];

    if($screen_type == 'load' || $screen_type == 'run') {
	// echo "to_path: $to_path, to_filename: $to_filename \n";

    	$object;
		$source_file = $asset_path.$from_url;
		$target_file_base = $zxscreen_path.$to_path.$to_filename;

		echo "$id: source_file: $source_file\n";
		echo "$id: to_path: $to_path, to_filename: $to_filename, target_file_base: $target_file_base\n";

		echo "$id: checking if source exists (source_file)\n";
		
		if(!is_file($source_file)) {
	    	echo "$id: [NOT FOUND] $source_file\n";
		} else if (filesize($source_file) < 6912) {
	    	echo "$id: [TO SMALL?] $source_file\n";
		} else if(file_exists($target_file_base.".gif") || file_exists($target_file_base.".png")) {
			echo "$id: target exists in either GIF or PNG (target_file_base)\n";
	    	// gif or png?
	    	$ext = "";
	    	if(file_exists($target_file_base.".gif")) {
		    	$ext = ".gif";
	    	}
	    	if(file_exists($target_file_base.".png")) {
		    	$ext = ".png";
	    	}
	    	echo "$id: [EXISTS] $target_file_base" . $ext . "\n";
	    	$newfilename = $to_filename . $ext;
	    	$outfile_converted = $to_path . $to_filename . $ext;

			if ($screen_type == 'load') {
				$type = 'Loading screen';
				$format = 'Picture';
			} else if ($screen_type == 'run') {
				$type = 'Running screen';
				$format = 'Picture';
			}
			$newfilesize = filesize($target_file_base.$ext);

			$object = (object) ['entry_id' => intval($entry_id), 'release_seq' => $release_seq, 'filename' => $newfilename, 'url' => $outfile_converted, 'scrUrl' => $from_url, 'size' => $newfilesize, 'type' => $type, 'format' => $format, 'title' => $title];
    	} else {
	    	echo "$id: converting source to " . $to_path . $to_filename . "\n";
	    	$object = convertScreen($id, $entry_id, $source_file, $from_url, $to_path, $to_filename, $title, $release_seq);

    	}
		if(is_null($scr_array[$id])) {
			$scr_array[$id] = array();
		}
		array_push($scr_array[$id], $object);
	}
}                              
fclose($fp);

/**

Update "screens" section for json documents

*/

echo "### GENERATING json FILES...\n";

foreach ($scr_array as $key => $items) {
	$json_file = str_pad($key, 7, '0', STR_PAD_LEFT) . ".json";
	$json_items = json_encode($items, JSON_UNESCAPED_SLASHES);
	$json_str = "{ \"screens\": $json_items }";

	$json_file = "../data/screens/" . $json_file;
	file_put_contents($json_file, $json_str);
	echo "saved json for $key in file: $json_file\n";
}

?>
