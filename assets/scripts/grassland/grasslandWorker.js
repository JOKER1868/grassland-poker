/* Offline strategy worker; the message contains only the acting player's observation. */
importScripts('grasslandCore.js');
self.onmessage=function(event) {
  try {self.postMessage({plan:GrasslandCore.searchAdvice(event.data)});}
  catch(error){self.postMessage({error:String(error)});}
};
