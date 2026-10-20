#!/usr/bin/env sh
# Downloads local copies of every client image used in the funnel.
# Run from this folder:  sh download-images.sh
# Until this runs, script.js falls back to the original Framer URLs (data-fallback).
set -e
B=https://framerusercontent.com/images
get() { curl -fsSL "$B/$1" -o "$2" && echo "ok  $2"; }
get ua5rkvqorVlnxACujGAHqUAXpDQ.png  hero-banner.png
get F2VvXmcAURPDcJ2mIhEGbAmL4.png    award-consultancy.png
get 3U5w4ctB8zRnntOEdxpjFRoSUw.png   award-small-project.png
get Z2XctMjwoJzzkdYbnehVhDQEuc.jpeg  skye-tansey.jpeg
get uujkGN9zz4TvUlSJmHH59Ytb8s.jpg   grove-hall-court.jpg
get UEOlK3dPWvXDzP9wyeNp3FiyW2g.jpg  ham-house.jpg
get p8JO78gb63r88aLfDlXcqskL5Q.png   mottcombe-pool.png
get W30G74GCOWz2xvQ1a8I6I7mjZeU.jpg  southlands-hospital.jpg
get wcT5LhhYfLM8ROtm81WVPg1DfmI.jpg  heat-network-southampton.jpg
get QWsG9Ag82UYVlepasDxQfRIotQ.jpg   moat-housing.jpg
get RTFeMrkg6JMjg4GZEmEOj6ahTvI.jpg  hospices.jpg
get svQhy3cWvots6B2Ek47abF1Mdfo.jpg  schools.jpg
get aeYRbCKkiU721Jq9c55hhYTX98.jpg   churches.jpg
