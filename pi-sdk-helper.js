(function(){
    // Shared Pi Browser SDK helpers for all Pi-enabled pages
    window.piSdkReady = false;
    window.piUser = null;
    window.piAccessToken = null;
    window.piAuthPromise = null;
    window.piAuthReady = false;

    function initPiSdk() {
        if (!window.Pi || typeof Pi.init !== 'function') {
            return false;
        }
        try {
            Pi.init({ version: '2.0', sandbox: false });
            window.piSdkReady = true;
            return true;
        } catch (e) {
            console.warn('Pi SDK not available:', e);
            return false;
        }
    }

    window.piDebug = function(message) {
        if (window.console && console.log) {
            console.log('[Pi SDK]', message);
        }
    };

    window.piHandleIncompletePayment = function(payment) {
        if (!payment || !payment.identifier) return;
        try {
            window.piDebug('Incomplete payment found: ' + payment.identifier);
            fetch('/api/pi/complete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ paymentId: payment.identifier, txid: payment.transaction && payment.transaction.txid })
            }).catch(function() {});
        } catch (err) {
            console.warn('Failed to handle incomplete payment:', err);
        }
    };

    window.piAuthenticate = function(callback, scopes) {
        scopes = Array.isArray(scopes) && scopes.length ? scopes : ['username', 'payments', 'wallet_address'];
        if (!window.piSdkReady) {
            if (typeof callback === 'function') callback(null);
            return Promise.reject(new Error('Pi SDK not initialized'));
        }

        var authPromise;
        try {
            authPromise = Pi.authenticate(scopes, window.piHandleIncompletePayment);
        } catch (err) {
            console.warn('Pi.authenticate threw:', err);
            if (typeof callback === 'function') callback(null);
            return Promise.reject(err);
        }

        window.piAuthPromise = authPromise;
        authPromise.then(function(auth) {
            window.piUser = auth.user || null;
            window.piAccessToken = auth.accessToken || null;
            window.piAuthReady = true;
            if (typeof callback === 'function') callback(auth);
        }).catch(function(err) {
            console.warn('Pi authentication failed:', err);
            if (typeof callback === 'function') callback(null);
        });

        return authPromise;
    };

    window.piOpenWalletOverview = function(onSuccess, onError) {
        var target = window.open('', '_blank');
        if (!target) {
            if (typeof onError === 'function') onError('Popup blocked or unable to open window');
            return;
        }
        if (!window.piSdkReady) {
            target.location = 'https://minepi.com';
            if (typeof onError === 'function') onError('Pi SDK not initialized');
            return;
        }
        window.piAuthenticate(function(auth) {
            var url = 'https://minepi.com';
            if (auth && auth.accessToken) {
                try {
                    target.location = url;
                    if (typeof onSuccess === 'function') onSuccess(url);
                } catch (err) {
                    if (typeof onError === 'function') onError(err);
                }
            } else {
                try { target.close(); } catch (e) {}
                if (typeof onError === 'function') onError('Pi wallet authentication failed');
            }
        }, ['username', 'wallet_address']);
    };

    window.piCreatePayment = function(amount, memo, metadata, onSuccess, onError) {
        if (!window.piSdkReady) {
            if (typeof onError === 'function') onError('Pi SDK not available');
            return;
        }
        var paymentOptions = {
            amount: amount,
            memo: memo,
            metadata: metadata || {}
        };
        Pi.createPayment(paymentOptions, {
            onReadyForServerApproval: function(paymentId) {
                if (typeof onSuccess !== 'function' && typeof window.piDebug === 'function') window.piDebug('Payment ready for approval: ' + paymentId);
                fetch('/api/pi/approve', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ paymentId: paymentId })
                }).then(function(response) { return response.json(); }).then(function(data) {
                    if (!data.success && typeof onError === 'function') {
                        onError(data.error || 'Server approval failed');
                    }
                }).catch(function(err) {
                    if (typeof onError === 'function') onError(err);
                });
            },
            onReadyForServerCompletion: function(paymentId, txid) {
                fetch('/api/pi/complete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ paymentId: paymentId, txid: txid })
                }).then(function(response) { return response.json(); }).then(function(data) {
                    if (data.success) {
                        if (typeof onSuccess === 'function') onSuccess(paymentId, txid);
                    } else if (typeof onError === 'function') {
                        onError(data.error || 'Completion failed');
                    }
                }).catch(function(err) {
                    if (typeof onError === 'function') onError(err);
                });
            },
            onCancel: function() {
                if (typeof onError === 'function') onError('cancelled');
            },
            onError: function(err) {
                if (typeof onError === 'function') onError(err);
            }
        });
    };

    window.piA2UPayment = function(amount, memo, metadata, onSuccess, onError) {
        if (!window.piUser || !window.piUser.uid) {
            if (typeof onError === 'function') onError('Pi user not authenticated');
            return;
        }
        fetch('/api/pi/a2u', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: amount, memo: memo || 'Pi A2U Payment', uid: window.piUser.uid, metadata: metadata || {} })
        }).then(function(response) { return response.json(); }).then(function(data) {
            if (data.success) {
                if (typeof onSuccess === 'function') onSuccess(data.paymentId, data.txid);
            } else if (typeof onError === 'function') {
                onError(data.error || 'A2U payment failed');
            }
        }).catch(function(err) {
            if (typeof onError === 'function') onError(err);
        });
    };
})();
