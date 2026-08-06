(function(){
  'use strict';

  var SPORT_KEY='omendaSportStateV1';
  var AVIATOR_KEY='omendaAviatorStateV1';
  var WITHDRAWAL_KEY='omendaSportWithdrawalsV1';
  var sportDefaults={balance:50,selections:[],tickets:[],favorites:[],ageConfirmed:false,maxStake:20,paused:false};
  var gameDefaults={history:[],records:[],pending:null};
  var sportState=loadState(SPORT_KEY,sportDefaults);
  var gameState=loadState(AVIATOR_KEY,gameDefaults);
  var withdrawalState=loadWithdrawalState();
  var status='waiting';
  var wager=null;
  var multiplier=1;
  var crashPoint=1;
  var roundSeed='';
  var startedAt=0;
  var animationFrame=0;
  var countdownTimer=0;
  var toastTimer=0;
  var withdrawalBusy=false;
  var withdrawalComplete=false;

  function loadState(key,defaults){
    try{var stored=JSON.parse(localStorage.getItem(key)||'null');return stored&&typeof stored==='object'?Object.assign({},defaults,stored):Object.assign({},defaults)}catch(error){return Object.assign({},defaults)}
  }
  function loadWithdrawalState(){
    try{
      var stored=JSON.parse(localStorage.getItem(WITHDRAWAL_KEY)||'null');
      if(!stored||typeof stored!=='object')stored=JSON.parse(localStorage.getItem(AVIATOR_KEY)||'null');
      return {withdrawals:stored&&Array.isArray(stored.withdrawals)?stored.withdrawals:[],pendingWithdrawal:stored&&stored.pendingWithdrawal?stored.pendingWithdrawal:null};
    }catch(error){return {withdrawals:[],pendingWithdrawal:null}}
  }
  function saveSport(){try{localStorage.setItem(SPORT_KEY,JSON.stringify(sportState))}catch(error){}}
  function saveGame(){try{localStorage.setItem(AVIATOR_KEY,JSON.stringify(gameState))}catch(error){}}
  function saveWithdrawal(){try{localStorage.setItem(WITHDRAWAL_KEY,JSON.stringify(withdrawalState))}catch(error){}}
  function secureRandom(){var values=new Uint32Array(2);crypto.getRandomValues(values);roundSeed=Array.from(values).map(function(value){return value.toString(16).padStart(8,'0')}).join('-');return values[0]/4294967296}
  function calculateCrashPoint(randomValue){return Math.min(25,Math.max(1.01,Math.floor((.99/(1-randomValue))*100)/100))}
  function formatPi(value){return Number(value||0).toFixed(2)+' \u03C0'}
  function refreshIcons(){if(window.lucide)window.lucide.createIcons()}

  function recoverInterruptedRound(){
    var pending=gameState.pending;
    if(!pending)return;
    if(pending.cashedAt){
      gameState.records.unshift({id:pending.id,date:new Date().toISOString(),stake:pending.stake,multiplier:pending.cashedAt,returnAmount:pending.payout,status:'Cashed out'});
    }else{
      sportState.balance=Number((sportState.balance+Number(pending.stake||0)).toFixed(2));
      gameState.records.unshift({id:pending.id,date:new Date().toISOString(),stake:pending.stake,multiplier:1,returnAmount:pending.stake,status:'Refunded'});
    }
    gameState.pending=null;gameState.records=gameState.records.slice(0,20);saveSport();saveGame();
  }

  function updateWallet(){
    document.getElementById('walletBalance').textContent=formatPi(sportState.balance);
    document.getElementById('withdrawableBalance').textContent=formatPi(sportState.balance);
    document.getElementById('modalWalletBalance').textContent=formatPi(sportState.balance);
    document.getElementById('stakeLimit').textContent=formatPi(sportState.maxStake);
    document.getElementById('responsibleStatus').textContent=sportState.paused?'All new demo bets are paused':'Maximum '+formatPi(sportState.maxStake)+' per flight';
    document.getElementById('openWithdrawButton').disabled=status!=='waiting'||withdrawalBusy||sportState.balance<.1;
    document.getElementById('headerWithdrawButton').disabled=status!=='waiting'||withdrawalBusy||sportState.balance<.1;
  }

  function setWithdrawStatus(message,tone){var element=document.getElementById('withdrawStatus');element.textContent=message;element.className='withdraw-status'+(tone?' '+tone:'')}
  function makeWithdrawalId(){var values=new Uint32Array(3);crypto.getRandomValues(values);return 'AVW_'+Array.from(values).map(function(value){return value.toString(36)}).join('_')}

  function setWithdrawalBusy(busy){
    withdrawalBusy=busy;
    document.getElementById('confirmWithdrawButton').disabled=busy||withdrawalComplete;
    document.getElementById('closeWithdrawButton').disabled=busy;
    document.getElementById('withdrawAmount').disabled=busy||withdrawalComplete||Boolean(withdrawalState.pendingWithdrawal);
    if(status==='waiting')document.getElementById('flightAction').disabled=busy||sportState.paused;
    updateWallet();
  }

  function openWithdrawal(){
    if(status!=='waiting'||wager){showToast('Finish the current flight before withdrawing');return}
    withdrawalComplete=false;
    var pending=withdrawalState.pendingWithdrawal;
    var amount=document.getElementById('withdrawAmount');
    amount.max=Math.min(100,sportState.balance).toFixed(2);
    amount.value=pending?Number(pending.amount).toFixed(2):Math.min(1,sportState.balance).toFixed(2);
    amount.disabled=Boolean(pending);
    setWithdrawStatus(pending?'A previous request was interrupted. Reconnect Pi Wallet to retry it safely.':'Pi authentication is required to continue.');
    var button=document.getElementById('confirmWithdrawButton');
    button.innerHTML='<i data-lucide="shield-check"></i><span>'+(pending?'Retry withdrawal':'Connect Pi Wallet')+'</span>';
    document.getElementById('withdrawModal').hidden=false;refreshIcons();
  }

  function closeWithdrawal(){if(!withdrawalBusy)document.getElementById('withdrawModal').hidden=true}

  async function submitWithdrawal(){
    if(withdrawalBusy||withdrawalComplete)return;
    var pending=withdrawalState.pendingWithdrawal;
    var amount=pending?Number(pending.amount):Number(document.getElementById('withdrawAmount').value);
    if(!Number.isFinite(amount)||amount<.1||amount>100){setWithdrawStatus('Choose an amount from 0.10 to 100 Pi.','error');return}
    if(amount>sportState.balance){setWithdrawStatus('The amount is higher than your available demo balance.','error');return}
    if(typeof window.piAuthenticate!=='function'||!window.piSdkReady){setWithdrawStatus('Open this app in Pi Browser to connect your Pi Wallet.','error');return}

    setWithdrawalBusy(true);
    document.getElementById('confirmWithdrawButton').innerHTML='<i data-lucide="loader-circle"></i><span>Connecting...</span>';refreshIcons();
    setWithdrawStatus('Waiting for Pi Wallet authentication...');
    try{
      var auth=await window.piAuthenticate(null,['username','wallet_address']);
      if(!auth||!auth.accessToken)throw new Error('Pi Wallet authentication was not completed');
      if(!pending){pending={requestId:makeWithdrawalId(),amount:Number(amount.toFixed(2)),createdAt:new Date().toISOString(),source:'aviator'};withdrawalState.pendingWithdrawal=pending;saveWithdrawal()}
      setWithdrawStatus('Authenticated as @'+((auth.user&&auth.user.username)||'Pi Pioneer')+'. Recording sandbox withdrawal...');
      document.getElementById('confirmWithdrawButton').innerHTML='<i data-lucide="loader-circle"></i><span>Processing...</span>';refreshIcons();
      var response=await fetch('/api/pi/sports-withdraw',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({amount:pending.amount,accessToken:auth.accessToken,requestId:pending.requestId})});
      var data=await response.json().catch(function(){return {}});
      if(!response.ok||!data.success){withdrawalState.pendingWithdrawal=null;saveWithdrawal();throw new Error(data.error||'Sandbox withdrawal was declined')}
      var alreadyRecorded=withdrawalState.withdrawals.some(function(item){return item.requestId===pending.requestId});
      if(!alreadyRecorded){
        sportState.balance=Number((sportState.balance-pending.amount).toFixed(2));
        withdrawalState.withdrawals.unshift({requestId:pending.requestId,paymentId:data.paymentId,txid:data.txid,amount:pending.amount,username:data.username||'',date:data.createdAt||new Date().toISOString(),demo:true,source:pending.source||'aviator'});
        withdrawalState.withdrawals=withdrawalState.withdrawals.slice(0,20);
      }
      withdrawalState.pendingWithdrawal=null;saveSport();saveWithdrawal();updateWallet();
      withdrawalComplete=true;
      setWithdrawStatus('Sandbox withdrawal recorded for @'+(data.username||'Pi Pioneer')+'. No real Pi was transferred.','success');
      document.getElementById('confirmWithdrawButton').innerHTML='<i data-lucide="check-circle-2"></i><span>Recorded '+formatPi(pending.amount)+'</span>';showToast('Pi Sandbox withdrawal recorded');
    }catch(error){
      var retained=Boolean(withdrawalState.pendingWithdrawal);
      setWithdrawStatus((error&&error.message?error.message:'Withdrawal failed')+(retained?' Your request is saved and can be retried safely.':''),'error');
      document.getElementById('confirmWithdrawButton').innerHTML='<i data-lucide="refresh-cw"></i><span>'+(retained?'Retry withdrawal':'Connect Pi Wallet')+'</span>';
    }finally{setWithdrawalBusy(false);refreshIcons()}
  }

  function updatePreview(){
    var stake=Math.max(0,Number(document.getElementById('stakeInput').value)||0);
    var target=document.getElementById('autoEnabled').checked?Math.max(1,Number(document.getElementById('autoCashoutInput').value)||2):2;
    document.getElementById('returnPreview').textContent=formatPi(stake*target);
  }

  function renderHistory(){
    var history=document.getElementById('multiplierHistory');
    if(!gameState.history.length){history.innerHTML='<em>No completed rounds yet</em>';return}
    history.innerHTML=gameState.history.slice(0,10).map(function(value){var level=value<2?'low':value<10?'mid':'high';return '<span class="history-chip '+level+'">'+Number(value).toFixed(2)+'x</span>'}).join('');
  }

  function renderRecords(){
    var container=document.getElementById('flightRecords');
    if(!gameState.records.length){container.innerHTML='<div class="records-empty">Complete a demo flight to see its result here.</div>';return}
    container.innerHTML=gameState.records.slice(0,12).map(function(record){var positive=record.status==='Cashed out'||record.status==='Refunded';return '<article class="flight-record"><div><strong>'+record.id+'</strong><span>'+new Date(record.date).toLocaleString()+' &middot; '+record.status+'</span></div><div class="record-stat"><span>Stake</span><strong>'+formatPi(record.stake)+'</strong></div><div class="record-stat"><span>Multiplier</span><strong>'+Number(record.multiplier).toFixed(2)+'x</strong></div><div class="record-stat record-return"><span>Return</span><strong class="'+(positive?'record-win':'record-loss')+'">'+formatPi(record.returnAmount)+'</strong></div></article>'}).join('');
  }

  function setRoundStatus(next,message){
    status=next;
    document.getElementById('roundDot').className='round-dot '+(next==='countdown'?'counting':next);
    document.getElementById('roundStatus').textContent=message;
    document.getElementById('consoleState').textContent=message;
    document.getElementById('flightStage').className='flight-stage '+(next==='flying'?'flying':next==='crashed'?'crashed':'');
    updateWallet();
  }

  function resetFlightVisual(){
    multiplier=1;
    var plane=document.getElementById('aviatorPlane');
    plane.className='aviator-plane';plane.style.left='8%';plane.style.bottom='16%';
    document.getElementById('flightTrail').style.width='0';
    document.getElementById('multiplier').textContent='1.00x';
    document.getElementById('roundMessage').textContent='Place a demo bet to launch';
    document.getElementById('roundSeed').textContent='Generated at takeoff';
  }

  function resetRound(){
    cancelAnimationFrame(animationFrame);clearInterval(countdownTimer);wager=null;setRoundStatus('waiting','Waiting for bet');resetFlightVisual();
    var action=document.getElementById('flightAction');
    action.disabled=sportState.paused;action.className='flight-action';action.innerHTML=sportState.paused?'<i data-lucide="pause-circle"></i><span>Betting paused</span>':'<i data-lucide="plane-takeoff"></i><span>Place demo bet</span>';
    refreshIcons();
  }

  function placeBet(){
    if(status!=='waiting')return;
    if(sportState.paused){showToast('New demo bets are paused in your limits');return}
    var stake=Number(document.getElementById('stakeInput').value);
    if(!Number.isFinite(stake)||stake<.1){showToast('Minimum demo stake is 0.10 \u03C0');return}
    if(stake>sportState.maxStake){showToast('Your shared stake limit is '+formatPi(sportState.maxStake));return}
    if(stake>sportState.balance){showToast('Demo wallet balance is too low');return}
    var autoEnabled=document.getElementById('autoEnabled').checked;
    var autoCashout=autoEnabled?Number(document.getElementById('autoCashoutInput').value):0;
    if(autoEnabled&&(!Number.isFinite(autoCashout)||autoCashout<1.1||autoCashout>20)){showToast('Choose auto cash-out from 1.10x to 20.00x');return}
    wager={id:'AV-'+Date.now().toString(36).toUpperCase(),stake:stake,autoCashout:autoCashout,cashedAt:0,payout:0};
    sportState.balance=Number((sportState.balance-stake).toFixed(2));gameState.pending=Object.assign({},wager);saveSport();saveGame();updateWallet();startCountdown();
  }

  function startCountdown(){
    setRoundStatus('countdown','Bet locked');
    var countdown=document.getElementById('countdown');var remaining=3;countdown.hidden=false;countdown.textContent=remaining;
    var action=document.getElementById('flightAction');action.disabled=true;action.innerHTML='<i data-lucide="lock"></i><span>Bet locked</span>';refreshIcons();
    countdownTimer=setInterval(function(){remaining-=1;if(remaining>0){countdown.textContent=remaining;return}clearInterval(countdownTimer);countdown.hidden=true;startFlight()},650);
  }

  function startFlight(){
    crashPoint=calculateCrashPoint(secureRandom());startedAt=performance.now();setRoundStatus('flying','Flight in progress');document.getElementById('roundSeed').textContent=roundSeed;document.getElementById('roundMessage').textContent='Cash out before the flight ends';updateFlightButton();animationFrame=requestAnimationFrame(tick);
  }

  function tick(now){
    var elapsed=(now-startedAt)/1000;multiplier=Math.min(crashPoint,Math.exp(elapsed*.29));updateFlightVisual();
    if(wager&&!wager.cashedAt&&wager.autoCashout&&multiplier>=wager.autoCashout&&wager.autoCashout<crashPoint)cashOut(wager.autoCashout);
    if(multiplier>=crashPoint){crashRound();return}
    updateFlightButton();animationFrame=requestAnimationFrame(tick);
  }

  function updateFlightVisual(){
    document.getElementById('multiplier').textContent=multiplier.toFixed(2)+'x';
    var progress=Math.min(.96,Math.log(multiplier)/Math.log(Math.max(crashPoint,2)));
    var plane=document.getElementById('aviatorPlane');plane.style.left=(8+76*progress)+'%';plane.style.bottom=(16+57*progress)+'%';document.getElementById('flightTrail').style.width=(8+69*progress)+'%';
  }

  function updateFlightButton(){
    var action=document.getElementById('flightAction');
    if(wager&&wager.cashedAt){action.disabled=true;action.className='flight-action';action.innerHTML='<i data-lucide="check-circle-2"></i><span>Cashed out '+formatPi(wager.payout)+'</span>'}
    else{action.disabled=false;action.className='flight-action cashout';action.innerHTML='<i data-lucide="circle-dollar-sign"></i><span>Cash out '+formatPi(wager.stake*multiplier)+'</span>'}
    refreshIcons();
  }

  function cashOut(forcedMultiplier){
    if(status!=='flying'||!wager||wager.cashedAt)return;
    var at=Number(forcedMultiplier||multiplier);wager.cashedAt=at;wager.payout=Number((wager.stake*at).toFixed(2));sportState.balance=Number((sportState.balance+wager.payout).toFixed(2));gameState.pending=Object.assign({},wager);saveSport();saveGame();updateWallet();updateFlightButton();showToast('Cashed out at '+at.toFixed(2)+'x for '+formatPi(wager.payout));
  }

  function crashRound(){
    cancelAnimationFrame(animationFrame);multiplier=crashPoint;setRoundStatus('crashed','Flight ended');document.getElementById('multiplier').textContent=crashPoint.toFixed(2)+'x';document.getElementById('roundMessage').textContent='Flew away';document.getElementById('aviatorPlane').classList.add('crashed');
    gameState.history.unshift(crashPoint);gameState.history=gameState.history.slice(0,20);
    gameState.records.unshift({id:wager.id,date:new Date().toISOString(),stake:wager.stake,multiplier:wager.cashedAt||crashPoint,returnAmount:wager.payout||0,status:wager.cashedAt?'Cashed out':'Lost'});gameState.records=gameState.records.slice(0,20);gameState.pending=null;saveGame();renderHistory();renderRecords();
    var action=document.getElementById('flightAction');action.disabled=true;action.className='flight-action';action.innerHTML='<i data-lucide="rotate-cw"></i><span>Next flight soon</span>';refreshIcons();setTimeout(resetRound,2600);
  }

  function showToast(message){var toast=document.getElementById('sportToast');toast.textContent=message;toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(function(){toast.classList.remove('show')},2600)}

  document.getElementById('flightAction').addEventListener('click',function(){if(status==='waiting')placeBet();else if(status==='flying')cashOut()});
  document.getElementById('stakeInput').addEventListener('input',updatePreview);
  document.getElementById('autoCashoutInput').addEventListener('input',updatePreview);
  document.getElementById('autoEnabled').addEventListener('change',function(){document.getElementById('autoCashoutInput').disabled=!this.checked;updatePreview()});
  document.querySelectorAll('[data-stake]').forEach(function(button){button.addEventListener('click',function(){document.getElementById('stakeInput').value=this.dataset.stake==='max'?Math.min(sportState.balance,sportState.maxStake).toFixed(2):this.dataset.stake;updatePreview()})});
  document.getElementById('clearHistoryButton').addEventListener('click',function(){gameState.history=[];gameState.records=[];saveGame();renderHistory();renderRecords()});
  document.getElementById('confirmAgeButton').addEventListener('click',function(){sportState.ageConfirmed=true;saveSport();document.getElementById('ageGate').hidden=true});
  document.getElementById('limitsButton').addEventListener('click',function(){document.getElementById('maxStakeInput').value=sportState.maxStake;document.getElementById('pauseBettingInput').checked=sportState.paused;document.getElementById('limitsModal').hidden=false});
  document.getElementById('closeLimitsButton').addEventListener('click',function(){document.getElementById('limitsModal').hidden=true});
  document.getElementById('saveLimitsButton').addEventListener('click',function(){var limit=Number(document.getElementById('maxStakeInput').value);if(!Number.isFinite(limit)||limit<.1||limit>100){showToast('Choose a limit from 0.10 to 100 \u03C0');return}sportState.maxStake=limit;sportState.paused=document.getElementById('pauseBettingInput').checked;saveSport();document.getElementById('limitsModal').hidden=true;updateWallet();if(status==='waiting')resetRound();showToast('Shared responsible limits saved')});
  document.getElementById('openWithdrawButton').addEventListener('click',openWithdrawal);
  document.getElementById('headerWithdrawButton').addEventListener('click',openWithdrawal);
  document.getElementById('closeWithdrawButton').addEventListener('click',closeWithdrawal);
  document.getElementById('confirmWithdrawButton').addEventListener('click',submitWithdrawal);
  document.getElementById('withdrawModal').addEventListener('click',function(event){if(event.target===this)closeWithdrawal()});
  window.addEventListener('storage',function(event){
    if(withdrawalBusy)return;
    if(event.key===SPORT_KEY){sportState=loadState(SPORT_KEY,sportDefaults);updateWallet();updatePreview()}
    if(event.key===AVIATOR_KEY&&status==='waiting'){gameState=loadState(AVIATOR_KEY,gameDefaults);renderHistory();renderRecords()}
    if(event.key===WITHDRAWAL_KEY){withdrawalState=loadWithdrawalState()}
  });
  window.addEventListener('focus',function(){
    if(withdrawalBusy)return;
    sportState=loadState(SPORT_KEY,sportDefaults);
    withdrawalState=loadWithdrawalState();
    if(status==='waiting'){gameState=loadState(AVIATOR_KEY,gameDefaults);renderHistory();renderRecords()}
    updateWallet();updatePreview();
  });

  recoverInterruptedRound();
  if(sportState.ageConfirmed)document.getElementById('ageGate').hidden=true;
  saveWithdrawal();
  updateWallet();updatePreview();renderHistory();renderRecords();resetRound();refreshIcons();
})();