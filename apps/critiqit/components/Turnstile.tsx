import React, { useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import WebView, { WebViewMessageEvent } from 'react-native-webview';
import { Turnstile as WebTurnstile } from '@marsidev/react-turnstile';

// Props for generic Turnstile component
interface TurnstileProps {
  onTokenReceived: (token: string) => void;
}

// Props for mobile Turnstile component
interface MobileTurnstileProps extends TurnstileProps {
  siteKey: string;
}

// Generic Turnstile component
export const Turnstile: React.FC<TurnstileProps> = ({ onTokenReceived }) => {
    // Get turnstile site key, make sure it's set
    const turnstileSiteKey = process.env.EXPO_PUBLIC_TURNSTILE_SITEKEY;
    if (!turnstileSiteKey) {
        console.error('Turnstile site key is not set in the environment variables.');
        return null;
    }

    // If on web, return prebuilt web Turnstile component
    if (Platform.OS === 'web') {
        return (
            <WebTurnstile
                siteKey={turnstileSiteKey}
                onSuccess={(token) => {
                    onTokenReceived(token)
                }}
            />
        )
    } 
    // If on mobile, return custom WebView-based Turnstile component
    else {
        return (
            <MobileTurnstile
                siteKey={turnstileSiteKey}
                onTokenReceived={(token) => {
                    onTokenReceived(token)
                }}
            />
        )
    }
}

export const MobileTurnstile: React.FC<MobileTurnstileProps> = ({ onTokenReceived, siteKey }) => {
  // Get turnstile base URL and size, make sure they're set
  const turnstileBaseUrl = process.env.EXPO_PUBLIC_TURNSTILE_BASE_URL;
  const turnstileSize = process.env.EXPO_PUBLIC_TURNSTILE_SIZE;
  if (!turnstileBaseUrl || !turnstileSize) {
    console.error('Turnstile base URL or size is not set in the environment variables.');
    return null;
  }

  // Set up web view height and message handler
  const [webViewHeight, setWebViewHeight] = useState(80);
  const handleMessage = (event: WebViewMessageEvent) => {
    const data = JSON.parse(event.nativeEvent.data);
    if (data.type === 'height') {
      setWebViewHeight(data.height);
    } else if (data.type === 'token') {
      onTokenReceived(data.token);
    }
  };
  return (
    <View style={[styles.container, { height: webViewHeight }]}>
      <WebView
        onMessage={handleMessage}
        domStorageEnabled={true}
        javaScriptEnabled={true}
        mixedContentMode="compatibility"
        scrollEnabled={false}
        source={{
            // Important to use baseURL for cloudflare domain issues
          baseUrl: turnstileBaseUrl,
          html: `
            <!DOCTYPE html>
            <html>
              <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
                <script src="https://challenges.cloudflare.com/turnstile/v0/api.js?onload=_turnstileCb" async defer></script>
                <style>
                  html, body {
                    margin: 0;
                    padding: 0;
                    width: 100%;
                    height: 100%;
                    overflow: hidden;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                  }
                  #myWidget {
                    width: 100%;
                  }
                </style>
              </head>
              <body>
                <div id="myWidget"></div>
                <script>
                  function _turnstileCb() {
                    turnstile.render('#myWidget', {
                      sitekey: '${siteKey}',
                      size: '${turnstileSize}',
                      callback: (token) => {
                        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'token', token }));
                      },
                    });
                    setTimeout(() => {
                      const widget = document.getElementById('myWidget');
                      const height = widget ? widget.offsetHeight : 80;
                      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'height', height }));
                    }, 1000);
                    window.addEventListener('resize', () => {
                      setTimeout(() => {
                        const widget = document.getElementById('myWidget');
                        const height = widget ? widget.offsetHeight : 80;
                        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'height', height }));
                      }, 100);
                    });
                  }
                </script>
              </body>
            </html>
          `,
        }}
        style={styles.webView}
      />
    </View>
  );
};
const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  webView: {
    flex: 1,
  },
});
