// ==UserScript==
// @name        Disable YouTube Video Ads
// @namespace   DisableYouTubeVideoAds
// @version     1.3.33
// @license     AGPLv3
// @description Disable YouTube video & screen based ads at home page, and right before or in the middle of the main video playback. Also disable YouTube's anti-adblocker popup dialog.
// @include     https://www.youtube.com/*
// @grant       none
// @run-at      document-start
// ==/UserScript==

((window) => {
    'use strict';
  
    // Block Ads in Player Responses
    function patchPlayerResponse(playerResponse) {
      delete playerResponse.adBreakHeartbeatParams;
      if (playerResponse.adPlacements) playerResponse.adPlacements = [];
      if (playerResponse.adSlots) playerResponse.adSlots = [];
      if (playerResponse.playerAds) playerResponse.playerAds = [];
      
      // Remove auxiliary ad-related UI elements
      if (playerResponse.auxiliaryUi?.messageRenderers?.bkaEnforcementMessageViewModel) {
        delete playerResponse.auxiliaryUi.messageRenderers.bkaEnforcementMessageViewModel;
        if (!Object.keys(playerResponse.auxiliaryUi.messageRenderers).length) {
          delete playerResponse.auxiliaryUi.messageRenderers;
          if (!Object.keys(playerResponse.auxiliaryUi).length) delete playerResponse.auxiliaryUi;
        }
      }
  
      // Ensure the video plays without errors
      const vd = playerResponse.videoDetails;
      delete playerResponse.videoDetails;
      Object.defineProperty(playerResponse, 'videoDetails', {
        get() {
          return vd;
        },
        set(v) {
          if (this.playabilityStatus?.errorScreen) {
            delete this.playabilityStatus.errorScreen;
            this.playabilityStatus.status = 'OK';
          }
          return v;
        }
      });
    }
  
    // Fetch Interception to Block Ad Requests
    const originalFetch = window.fetch;
    window.fetch = function (url, ...args) {
      if (/\/v1\/player\/ad_break/.test(url)) return new Promise(() => {});
      return originalFetch.apply(this, [url, ...args]);
    };
  
    // XMLHttpRequest Interception to Block Ad Requests
    const originalXHROpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (method, url, ...args) {
      if (/get_midroll_info|\/v1\/player\/ad_break/.test(url)) return;
      this.url = url;
      return originalXHROpen.apply(this, [method, url, ...args]);
    };
  
    // JSON Interception to Block Ad Data
    const originalJSONParse = JSON.parse;
    JSON.parse = function (text, ...args) {
      const parsed = originalJSONParse.apply(this, [text, ...args]);
      if (parsed?.playerResponse) {
        patchPlayerResponse(parsed.playerResponse);
      }
      return parsed;
    };
  
    // Function to Remove DOM Ads
    function removeAdsFromDOM() {
      const adElements = document.querySelectorAll('.video-ads, .ytp-ad-module');
      adElements.forEach(adElement => adElement.remove());
  
      const skipButton = document.querySelector('.ytp-ad-skip-button');
      if (skipButton) skipButton.click();
    }
  
    // Observe DOM Mutations and Remove Ads
    const observer = new MutationObserver(removeAdsFromDOM);
    observer.observe(document.documentElement, { childList: true, subtree: true });
  
    // Initial Ad Removal on Page Load
    window.addEventListener('load', removeAdsFromDOM);
  })(window);
  