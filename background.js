// 차단된 사이트 목록 저장소
let blockedSites = [];

// 확장 프로그램 설치/업데이트 시 초기화
chrome.runtime.onInstalled.addListener(async () => {
  // 컨텍스트 메뉴 생성
  chrome.contextMenus.create({
    id: 'blockSite',
    title: 'Block this site',
    contexts: ['link', 'page']
  });

  // 저장된 차단 목록 로드
  await loadBlockedSites();
});

// 시작 시 차단 목록 로드
chrome.runtime.onStartup.addListener(async () => {
  await loadBlockedSites();
});

// 저장소에서 차단 목록 로드
async function loadBlockedSites() {
  const data = await chrome.storage.local.get('blockedSites');
  blockedSites = data.blockedSites || [];
  await updateBlockingRules();
}

// 컨텍스트 메뉴 클릭 처리
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'blockSite') {
    let url;
    
    // 링크를 우클릭한 경우
    if (info.linkUrl) {
      url = info.linkUrl;
    } 
    // 페이지를 우클릭한 경우
    else if (info.pageUrl) {
      url = info.pageUrl;
    }

    if (url) {
      const domain = extractDomain(url);
      await addBlockedSite(domain);
    }
  }
});

// URL에서 도메인 추출
function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    
    // /redirect?external=(url) 형식 처리
    if (urlObj.pathname === '/redirect' && urlObj.searchParams.has('external')) {
      const externalUrl = urlObj.searchParams.get('external');
      try {
        const externalUrlObj = new URL(externalUrl);
        return externalUrlObj.hostname;
      } catch (e) {
        // external 파라미터가 유효한 URL이 아닌 경우 원본 도메인 반환
        return urlObj.hostname;
      }
    }
    
    return urlObj.hostname;
  } catch (e) {
    return url;
  }
}

// 차단 사이트 추가
async function addBlockedSite(domain) {
  if (!blockedSites.includes(domain)) {
    blockedSites.push(domain);
    await chrome.storage.local.set({ blockedSites });
    await updateBlockingRules();
  }
}

// 차단 사이트 제거
async function removeBlockedSite(domain) {
  blockedSites = blockedSites.filter(site => site !== domain);
  await chrome.storage.local.set({ blockedSites });
  await updateBlockingRules();
}

// declarativeNetRequest 규칙 업데이트
async function updateBlockingRules() {
  // 기존 규칙 모두 제거
  const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
  const ruleIdsToRemove = existingRules.map(rule => rule.id);
  
  // 새 규칙 생성
  const newRules = blockedSites.map((domain, index) => ({
    id: index + 1,
    priority: 1,
    action: { type: 'block' },
    condition: {
      urlFilter: `*://${domain}/*`,
      resourceTypes: ['main_frame', 'sub_frame', 'stylesheet', 'script', 'image', 'font', 'object', 'xmlhttprequest', 'ping', 'csp_report', 'media', 'websocket', 'other']
    }
  }));

  // 규칙 업데이트
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: ruleIdsToRemove,
    addRules: newRules
  });
}

// 팝업에서 메시지 수신
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getBlockedSites') {
    sendResponse({ blockedSites });
  } else if (request.action === 'addBlockedSite') {
    addBlockedSite(request.domain).then(() => {
      sendResponse({ success: true, blockedSites });
    });
    return true; // 비동기 응답
  } else if (request.action === 'removeBlockedSite') {
    removeBlockedSite(request.domain).then(() => {
      sendResponse({ success: true, blockedSites });
    });
    return true; // 비동기 응답
  }
});