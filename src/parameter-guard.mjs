// Parameter constraints for Ver.2. No automatic production writes.
export const PARAMETER_RULES=Object.freeze({
 raceSpread:[1,60],marketCoverage:[.1,1],favoriteOddsStart:[1,100],favoriteOddsScale:[1,100],
 hardThreshold:[.05,.85],upsetThreshold:[.15,.95],historyWindow:[30,2000],
 trainingMinimum:[30,500],shrinkage:[50,500],weightSensitivity:[0,8],
 weightMin:[.8,1],weightMax:[1,1.2],validationWindow:[50,500],
 validationMinimum:[50,500],validationHitMargin:[3,20],validationAlpha:[.005,.05],
 validationReturnMargin:[0,.2],minLineWeight:[1,3],relatedGradeFactor:[.1,1],
 relatedRegimeFactor:[.1,1],localValidationMinimum:[12,500],
 forecastTimeoutMs:[1000,15000],reviewBatch:[1,16],backupDelayMs:[100,5000],
 marketValidationMinimum:[50,500],venueHistoryWindow:[10,300],
 venueHistoryMinimum:[10,100],venueScoreWeight:[0,.25],
 venueScoreCap:[.005,.08],venueShrinkage:[10,100]
});
export function validateParameters(params){
 const errors=[];
 if(!params||typeof params!=="object"||Array.isArray(params))return {ok:false,errors:["invalid_parameter_object"]};
 for(const [name,[min,max]] of Object.entries(PARAMETER_RULES)){
  const value=params[name];
  if(!Number.isFinite(value)||value<min||value>max)errors.push(name+":out_of_range");
 }
 if(Number.isFinite(params.hardThreshold)&&Number.isFinite(params.upsetThreshold)&&params.hardThreshold>=params.upsetThreshold)errors.push("regime_threshold_order");
 if(Number.isFinite(params.weightMin)&&Number.isFinite(params.weightMax)&&params.weightMin>params.weightMax)errors.push("weight_bounds_order");
 if(Number.isFinite(params.validationWindow)&&Number.isFinite(params.validationMinimum)&&params.validationWindow<params.validationMinimum)errors.push("validation_window_too_small");
 if(Number.isFinite(params.historyWindow)&&Number.isFinite(params.trainingMinimum)&&params.historyWindow<params.trainingMinimum)errors.push("training_window_too_small");
 if(Number.isFinite(params.venueHistoryWindow)&&Number.isFinite(params.venueHistoryMinimum)&&params.venueHistoryWindow<params.venueHistoryMinimum)errors.push("venue_window_too_small");
 return {ok:errors.length===0,errors};
}
