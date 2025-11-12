// DOM 요소
const urlInput = document.getElementById('urlInput');
const addBtn = document.getElementById('addBtn');
const sitesList = document.getElementById('sitesList');
const emptyMessage = document.getElementById('emptyMessage');

// 페이지 로드 시 차단된 사이트 목록 가져오기
loadBlockedSites();

// 차단된 사이트 목록 로드
async function loadBlockedSites() {
  const response = await chrome.runtime.sendMessage({ action: 'getBlockedSites' });
  displayBlockedSites(response.blockedSites);
}

// 차단된 사이트 표시
function displayBlockedSites(sites) {
  sitesList.innerHTML = '';
  
  if (sites.length === 0) {
    emptyMessage.style.display = 'block';
  } else {
    emptyMessage.style.display = 'none';
  }
  
  
  sites.forEach(site => {
    const siteItem = document.createElement('div');
    siteItem.className = 'site-item';
    
    const domainSpan = document.createElement('span');
    domainSpan.className = 'site-domain';
    domainSpan.textContent = site;
    
    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-btn';
    removeBtn.textContent = 'Unblock';
    removeBtn.onclick = () => removeSite(site);
    
    siteItem.appendChild(domainSpan);
    siteItem.appendChild(removeBtn);
    sitesList.appendChild(siteItem);
  });
}

// 사이트 추가
async function addSite() {
  const domain = urlInput.value.trim();
  
  if (!domain) {
    alert('Please enter the domain.');
    return;
  }
  
  // URL에서 도메인만 추출
  let cleanDomain = domain;
  try {
    if (domain.includes('://')) {
      const url = new URL(domain);
      cleanDomain = url.hostname;
    } else if (!domain.includes('.')) {
      alert('Please enter the correct domain. (ex: example.com)');
      return;
    }
  } catch (e) {
    // URL 파싱 실패시 그대로 사용
  }
  
  const response = await chrome.runtime.sendMessage({ 
    action: 'addBlockedSite', 
    domain: cleanDomain 
  });
  
  if (response.success) {
    urlInput.value = '';
    displayBlockedSites(response.blockedSites);
  }
}

// 사이트 제거
async function removeSite(domain) {
  const response = await chrome.runtime.sendMessage({ 
    action: 'removeBlockedSite', 
    domain 
  });
  
  if (response.success) {
    displayBlockedSites(response.blockedSites);
  }
}

// 이벤트 리스너
addBtn.addEventListener('click', addSite);
urlInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    addSite();
  }
});