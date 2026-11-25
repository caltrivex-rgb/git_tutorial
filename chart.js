(() => {
  'use strict';
  const money = n => '¥' + Math.round(n).toLocaleString('zh-CN');
  const colors = ['#C68B59','#E8D5B7','#8d6650','#a88c72','#6d5445','#d7ad82'];
  const weekdayNames = ['周日','周一','周二','周三','周四','周五','周六'];
  const dates = [...new Set(SALES_DATA.map(x => x.date))].sort();
  const allStores = [...new Set(SALES_DATA.map(x => x.store))];
  const storeSelect = document.getElementById('storeFilter');
  allStores.forEach(store => { const opt = document.createElement('option'); opt.value = store; opt.textContent = store; storeSelect.appendChild(opt); });
  const state = { grain: 'day', category: null, charts: {}, range: 'all' };
  const commonOptions = { responsive:true, maintainAspectRatio:false, animation:{duration:850}, plugins:{legend:{labels:{color:'#c7b9ae',boxWidth:10,boxHeight:10,font:{size:10}}},tooltip:{backgroundColor:'#171412',titleColor:'#E8D5B7',bodyColor:'#f4eee8',borderColor:'#554238',borderWidth:1,padding:10,displayColors:true}}, scales:{x:{ticks:{color:'#a89b91',font:{size:9}},grid:{color:'#ffffff0b'}},y:{beginAtZero:true,ticks:{color:'#a89b91',font:{size:9}},grid:{color:'#ffffff0d'}}} };
  if (window.Chart) { Chart.defaults.color = '#a89b91'; Chart.defaults.font.family = 'Inter, "PingFang SC", sans-serif'; }
  function dateInRange(date) {
    if (state.range === 'today') return date === dates[dates.length - 1];
    if (state.range === 'week') return date >= dates[Math.max(0, dates.length - 7)];
    if (state.range === 'quarter') return true;
    if (state.range === 'custom') {
      const from = document.getElementById('fromDate').value || dates[0];
      const to = document.getElementById('toDate').value || dates[dates.length - 1];
      return date >= from && date <= to;
    }
    return true;
  }
  function filteredRows(ignoreCategory = false) {
    return SALES_DATA.filter(r => dateInRange(r.date)
      && (storeSelect.value === 'all' || r.store === storeSelect.value)
      && (document.getElementById('channelFilter').value === 'all' || r.channel === document.getElementById('channelFilter').value)
      && (ignoreCategory || !state.category || r.category === state.category));
  }
  function total(rows) { return rows.reduce((s,r) => s + r.revenue, 0); }
  function aggregate(rows, key, metric='revenue') {
    return rows.reduce((a,r) => { a[r[key]] = (a[r[key]] || 0) + r[metric]; return a; }, {});
  }
  function groupDate(rows) {
    const map = {};
    rows.forEach(r => { const key = state.grain === 'day' ? r.date : state.grain === 'week' ? `第${Math.floor((Number(r.date.slice(-2))-1)/7)+1}周` : r.date.slice(0,7); map[key]=(map[key]||0)+r.revenue; });
    return map;
  }
  function makeChart(id, config) {
    const canvas = document.getElementById(id);
    if (!window.Chart) { canvas.parentElement.innerHTML = '<div class="empty">Chart.js CDN 加载失败，请联网后刷新</div>'; return null; }
    return new Chart(canvas, config);
  }
  function setChart(key,id,config) {
    if (state.charts[key]) { state.charts[key].destroy(); }
    state.charts[key] = makeChart(id,config);
  }
  function animateValue(el, value, format) {
    const start = Number(el.dataset.value || 0); const end = value; const begin = performance.now(); const duration = 550;
    function frame(now) { const p=Math.min(1,(now-begin)/duration); const eased=1-Math.pow(1-p,3); el.textContent=format(start+(end-start)*eased); if(p<1) requestAnimationFrame(frame); }
    el.dataset.value = String(end); requestAnimationFrame(frame);
  }
  function updateKpis(rows) {
    const sales=total(rows), units=rows.reduce((s,r)=>s+r.units,0), orders=Math.round(units*.68), members=rows.reduce((s,r)=>s+r.memberUnits,0);
    const items=aggregate(rows,'menu','units'); const best=Object.entries(items).sort((a,b)=>b[1]-a[1])[0];
    const days=[...new Set(rows.map(r=>r.date))].length; const midpoint=Math.ceil(days/2); const byDay=Object.entries(rows.reduce((a,r)=>{a[r.date]=(a[r.date]||0)+r.revenue;return a;},{})).sort((a,b)=>a[0].localeCompare(b[0]));
    const prev=byDay.slice(0,midpoint).reduce((s,x)=>s+x[1],0), curr=byDay.slice(midpoint).reduce((s,x)=>s+x[1],0); const growth=prev ? ((curr-prev)/prev*100) : 0;
    animateValue(document.getElementById('salesKpi'),sales,v=>money(v));
    animateValue(document.getElementById('ordersKpi'),orders,v=>Math.round(v).toLocaleString('zh-CN'));
    animateValue(document.getElementById('avgKpi'),orders?sales/orders:0,v=>money(v));
    animateValue(document.getElementById('growthKpi'),growth,v=>(v>=0?'+':'')+v.toFixed(1)+'%');
    animateValue(document.getElementById('memberKpi'),units?members/units*100:0,v=>v.toFixed(1)+'%');
    document.getElementById('growthKpi').className='kpi-value '+(growth>=0?'positive':'');
    document.getElementById('bestKpi').textContent=best?best[0]:'—'; document.getElementById('bestFoot').textContent=best?`${best[1].toLocaleString()} 件`:'当前筛选无数据';
    document.getElementById('salesFoot').textContent=`${days} 天 · ${rows.length} 条菜单日记录`;
  }
  function updateTrend(rows) {
    const grouped=groupDate(rows), labels=Object.keys(grouped), vals=Object.values(grouped);
    // Forecast: straight-line visual estimate using recent seven-day average.
    const daily={}; rows.forEach(r=>daily[r.date]=(daily[r.date]||0)+r.revenue);
    const dailyVals=Object.values(daily); const recent=dailyVals.slice(-7); const avg=recent.length?recent.reduce((a,b)=>a+b,0)/recent.length:0;
    let chartLabels=[...labels], actual=vals, forecast=Array(labels.length).fill(null);
    if(state.grain==='day' && labels.length){ forecast[labels.length-1]=vals[vals.length-1]; for(let i=1;i<=7;i++){const d=new Date(`${dates[dates.length-1]}T00:00:00Z`);d.setUTCDate(d.getUTCDate()+i);chartLabels.push(d.toISOString().slice(5,10));actual.push(null);forecast.push(avg*(1+(i-1)*.006));} }
    setChart('trend','trendChart',{type:'line',data:{labels:chartLabels,datasets:[{label:'实际销售额',data:actual,borderColor:colors[0],backgroundColor:'#C68B5920',fill:true,tension:.36,pointRadius:state.grain==='day'?2:3,pointHoverRadius:5,spanGaps:false},{label:'预测趋势',data:forecast,borderColor:colors[1],backgroundColor:'transparent',borderDash:[6,5],tension:.25,pointRadius:2,spanGaps:false}]},options:{...commonOptions,plugins:{...commonOptions.plugins,tooltip:{...commonOptions.plugins.tooltip,callbacks:{label:c=>`${c.dataset.label}: ${money(c.raw||0)}`}}},scales:{...commonOptions.scales,x:{...commonOptions.scales.x,ticks:{...commonOptions.scales.x.ticks,maxTicksLimit:10}},y:{...commonOptions.scales.y,ticks:{...commonOptions.scales.y.ticks,callback:v=>'¥'+Number(v).toLocaleString()}}}}});
    const sorted=Object.entries(daily).sort((a,b)=>a[0].localeCompare(b[0]));
    if(sorted.length>=5){const vals2=sorted.map(x=>x[1]), mean=vals2.reduce((a,b)=>a+b,0)/vals2.length, sd=Math.sqrt(vals2.reduce((a,b)=>a+(b-mean)**2,0)/vals2.length);const anomalies=sorted.filter(x=>sd&&Math.abs(x[1]-mean)>2*sd);const note=document.getElementById('anomalyNote');note.hidden=!anomalies.length;note.textContent=anomalies.length?`波动提示：${anomalies.map(x=>`${x[0]}（${money(x[1])}）`).join('、')} 与周期均值差异超过 2 个标准差；仅为自动统计提示。`:'';} else document.getElementById('anomalyNote').hidden=true;
  }
  function updateCategory(rows) {
    const sums=aggregate(rows,'category'); const names=Object.keys(sums);
    setChart('category','categoryChart',{type:'doughnut',data:{labels:names,datasets:[{data:Object.values(sums),backgroundColor:colors,borderColor:'#211c19',borderWidth:3,hoverOffset:8}]},options:{responsive:true,maintainAspectRatio:false,cutout:'65%',plugins:{...commonOptions.plugins,legend:{position:'bottom',labels:{color:'#c7b9ae',boxWidth:9,padding:12,font:{size:10}}},tooltip:{...commonOptions.plugins.tooltip,callbacks:{label:c=>`${c.label}: ${money(c.raw)}`}}},onClick:(event,elements,chart)=>{if(!elements.length)return;const category=chart.data.labels[elements[0].index];state.category=state.category===category?null:category;refresh();}}});
  }
  function updateTop(rows) {
    const sums=aggregate(rows,'menu','units'), entries=Object.entries(sums).sort((a,b)=>a[1]-b[1]).slice(-10);
    setChart('top','topChart',{type:'bar',data:{labels:entries.map(x=>x[0]),datasets:[{label:'销量',data:entries.map(x=>x[1]),backgroundColor:entries.map((_,i)=>i===entries.length-1?colors[0]:'#76583f'),borderRadius:5,barThickness:18}]},options:{...commonOptions,indexAxis:'y',plugins:{...commonOptions.plugins,legend:{display:false},tooltip:{...commonOptions.plugins.tooltip,callbacks:{label:c=>`销量：${c.raw} 件`}}},scales:{x:{...commonOptions.scales.x,grid:{color:'#ffffff0d'}},y:{...commonOptions.scales.y,grid:{display:false}}}}});
  }
  function updateStore(rows) {
    const stores=[...new Set(SALES_DATA.map(r=>r.store))], channels=['堂食','外卖','自提'];
    const datasets=channels.map((channel,i)=>({label:channel,data:stores.map(store=>rows.filter(r=>r.store===store&&r.channel===channel).reduce((s,r)=>s+r.revenue,0)),backgroundColor:[colors[0],colors[2],colors[1]][i],borderRadius:3}));
    setChart('store','storeChart',{type:'bar',data:{labels:stores,datasets},options:{...commonOptions,plugins:{...commonOptions.plugins,tooltip:{...commonOptions.plugins.tooltip,callbacks:{label:c=>`${c.dataset.label}: ${money(c.raw)}`}}},scales:{x:{...commonOptions.scales.x,stacked:true},y:{...commonOptions.scales.y,stacked:true,ticks:{...commonOptions.scales.y.ticks,callback:v=>'¥'+Number(v).toLocaleString()}}}}});
  }
  function updatePayment(rows) {
    const sums=aggregate(rows,'payment');
    setChart('payment','paymentChart',{type:'doughnut',data:{labels:Object.keys(sums),datasets:[{data:Object.values(sums),backgroundColor:colors.slice(0,3),borderColor:'#211c19',borderWidth:3}]},options:{responsive:true,maintainAspectRatio:false,cutout:'60%',plugins:{...commonOptions.plugins,legend:{position:'bottom',labels:{color:'#c7b9ae',boxWidth:9,padding:12,font:{size:10}}},tooltip:{...commonOptions.plugins.tooltip,callbacks:{label:c=>`${c.label}: ${money(c.raw)}`}}}}});
  }
  function updateMembers(rows) {
    const grouped={}; rows.forEach(r=>{const key=r.date; if(!grouped[key])grouped[key]={member:0,guest:0}; const memberRevenue=r.unitPrice*r.memberUnits;grouped[key].member+=memberRevenue;grouped[key].guest+=r.revenue-memberRevenue;});
    const keys=Object.keys(grouped).sort();
    setChart('member','memberChart',{type:'line',data:{labels:keys,datasets:[{label:'会员',data:keys.map(k=>grouped[k].member),borderColor:colors[0],backgroundColor:'#C68B5920',fill:true,tension:.3,pointRadius:1},{label:'非会员',data:keys.map(k=>grouped[k].guest),borderColor:colors[1],backgroundColor:'#E8D5B710',fill:true,tension:.3,pointRadius:1}]},options:{...commonOptions,plugins:{...commonOptions.plugins,tooltip:{...commonOptions.plugins.tooltip,callbacks:{label:c=>`${c.dataset.label}: ${money(c.raw)}`}}},scales:{...commonOptions.scales,x:{...commonOptions.scales.x,ticks:{...commonOptions.scales.x.ticks,maxTicksLimit:7}}}}});
  }
  function updateWeekdays(rows) {
    const sums={},counts={}; rows.forEach(r=>{const day=weekdayNames[new Date(`${r.date}T00:00:00Z`).getUTCDay()];sums[day]=(sums[day]||0)+r.revenue;});
    Object.keys(sums).forEach(day=>{const dateSet=new Set(rows.filter(r=>weekdayNames[new Date(`${r.date}T00:00:00Z`).getUTCDay()]===day).map(r=>r.date));counts[day]=dateSet.size;});
    document.getElementById('weekdayTable').innerHTML=weekdayNames.slice(1).concat(weekdayNames[0]).map(day=>`<tr><td>${day}</td><td>${counts[day]?money(sums[day]/counts[day]):'—'}</td><td>${counts[day]||0}</td></tr>`).join('');
  }
  function updateHeatmap(rows) {
    const sums={}; rows.forEach(r=>{const day=weekdayNames[new Date(`${r.date}T00:00:00Z`).getUTCDay()];const key=`${day}-${r.hour}`;sums[key]=(sums[key]||0)+r.units;});
    const max=Math.max(1,...Object.values(sums)), days=['周一','周二','周三','周四','周五','周六','周日'], hours=Array.from({length:15},(_,i)=>i+8);
    const root=document.getElementById('heatmap');root.innerHTML='<div></div>'+hours.map(h=>`<div class="heat-hour">${h%2===0?String(h).padStart(2,'0'):''}</div>`).join('')+days.map(day=>`<div class="heat-label">${day}</div>`+hours.map(h=>{const value=sums[`${day}-${h}`]||0,level=value/max;const alpha=.16+level*.84;return `<div class="heat-cell" title="${day} ${h}:00 · ${value} 件" style="background:rgba(198,139,89,${alpha.toFixed(2)})"></div>`;}).join('')).join('');
  }
  function refresh() {
    const rows=filteredRows(); updateKpis(rows); updateTrend(rows); updateCategory(filteredRows(true)); updateTop(rows); updateStore(filteredRows(true)); updatePayment(rows); updateMembers(rows); updateWeekdays(rows); updateHeatmap(rows);
    document.getElementById('clearCategory').textContent=state.category?`清除：${state.category}`:'清除筛选';
  }
  document.getElementById('datePreset').addEventListener('change',e=>{state.range=e.target.value;document.getElementById('customRange').hidden=state.range!=='custom';refresh();});
  ['storeFilter','channelFilter','fromDate','toDate'].forEach(id=>document.getElementById(id).addEventListener('change',refresh));
  document.getElementById('clearCategory').addEventListener('click',()=>{state.category=null;refresh();});
  document.querySelectorAll('#trendPills button').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('#trendPills button').forEach(b=>b.classList.remove('active'));button.classList.add('active');state.grain=button.dataset.grain;refresh();}));
  document.getElementById('exportCsv').addEventListener('click',()=>{const rows=filteredRows();const header=['日期','菜单','品类','销量','单价','销售额','门店','渠道','支付方式','会员销量','小时'];const lines=[header,...rows.map(r=>[r.date,r.menu,r.category,r.units,r.unitPrice,r.revenue,r.store,r.channel,r.payment,r.memberUnits,r.hour])].map(row=>row.map(v=>`"${String(v).replaceAll('"','""')}"`).join(',')).join('\n');const blob=new Blob(['\ufeff'+lines],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='fictional-coffee-sales.csv';a.click();URL.revokeObjectURL(url);});
  if(!window.Chart){document.querySelectorAll('canvas').forEach(canvas=>canvas.parentElement.innerHTML='<div class="empty">Chart.js CDN 加载失败，请联网后刷新</div>');}
  refresh();
})();
