import {ReadableDetails} from './ReadableDetails.jsx';
import {readableValue} from './displayValues.js';
const pick=(data,keys)=>Object.fromEntries(keys.filter(key=>key in data).map(key=>[key,data[key]]));
export function MedicalRecordDetails({data}){
  if(!data)return null;
  return <article className="rf-medical-details bg-white border rounded-xl p-5 space-y-5">
    <header className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-xl font-bold">Hồ sơ khám #{data.medicalRecordId}</h3><span className={`rf-status ${data.status==='CONFIRMED'?'rf-status-completed':'rf-status-scheduled'}`}>{readableValue('status',data.status)}</span></header>
    <ReadableDetails data={pick(data,['examType','examinedAt','healthStatus','veterinarianId','confirmedAt','correctionOfId'])}/>
    <section><h4 className="rf-section-title">Chỉ số sinh tồn</h4>{data.vitalSign?<ReadableDetails data={pick(data.vitalSign,['bodyTemperature','restingHeartRate','restingRespiratoryRate'])}/>:<p>Chưa có chỉ số sinh tồn.</p>}</section>
    <section><h4 className="rf-section-title">Khám lâm sàng</h4>{data.clinicalExams?.length?<div className="rf-table-scroll"><table className="rf-clinical-table"><thead><tr>{['Vùng khám','Tình trạng','Bất thường','Mức độ','Ghi chú'].map(label=><th key={label} scope="col">{label}</th>)}</tr></thead><tbody>{data.clinicalExams.map((exam,index)=><tr key={exam.clinicalExamId||index}>{['examinationArea','conditionStatus','abnormalityType','severity','notes'].map(key=><td key={key}>{readableValue(key,exam[key])}</td>)}</tr>)}</tbody></table></div>:<p>Chưa có kết quả khám lâm sàng.</p>}</section>
    <section><h4 className="rf-section-title">Chẩn đoán và chăm sóc</h4><ReadableDetails data={pick(data,['diagnosis','treatment','medication','careRecommendation','notes'])}/></section>
    <section><h4 className="rf-section-title">Kết luận và tập luyện</h4><ReadableDetails data={pick(data,['systemNote','trainingNote'])}/></section>
    <details><summary className="cursor-pointer font-semibold">Thông tin hồ sơ</summary><ReadableDetails data={pick(data,['profileId','createdAt','updatedAt'])}/></details>
  </article>;
}
