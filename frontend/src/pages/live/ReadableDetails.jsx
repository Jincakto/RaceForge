import {displayLabels,hiddenDetailFields,readableValue} from './displayValues.js';

export function DetailValue({name,value}){
  if(Array.isArray(value))return value.length?<div className="rf-nested-list">{value.map((item,index)=><div key={index} className="rf-nested-item"><DetailValue name={name} value={item}/></div>)}</div>:<span>Chưa có</span>;
  if(value&&typeof value==='object'){
    if('roleName' in value)return <span>{readableValue('roleName',value.roleName)}</span>;
    return <dl className="rf-detail-grid rf-detail-grid--nested">{Object.entries(value).filter(([key])=>!hiddenDetailFields.has(key)).map(([key,entry])=><div className="rf-detail-field" key={key}><dt>{displayLabels[key]||key}</dt><dd><DetailValue name={key} value={entry}/></dd></div>)}</dl>;
  }
  return <span>{readableValue(name,value)}</span>;
}
export function ReadableDetails({data}){
  if(!data)return null;
  return <dl className="rf-detail-grid bg-white border rounded-xl p-4">{Object.entries(data).filter(([key])=>!hiddenDetailFields.has(key)).map(([key,value])=><div key={key} className={`rf-detail-field ${value&&typeof value==='object'?'rf-detail-wide':''}`}><dt>{displayLabels[key]||key}</dt><dd><DetailValue name={key} value={value}/></dd></div>)}</dl>;
}
