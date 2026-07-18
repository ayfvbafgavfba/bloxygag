import Cookies from 'js-cookie'

function isSecureContext() {
    return typeof window !== 'undefined' && window.location.protocol === 'https:';
}

function getCookieOptions() {
    return {
        expires: 3650,
        path: '/',
        sameSite: isSecureContext() ? 'none' : 'lax',
        secure: isSecureContext(),
    };
}

function getJWT () {
    if (typeof window === 'undefined') return null;
    return Cookies.get('jwt') || window.localStorage.getItem('jwt') || window.sessionStorage.getItem('jwt');
}

function setJWT(token) {
    if (!token || typeof window === 'undefined') return;
    Cookies.set('jwt', token, getCookieOptions());
    window.localStorage.setItem('jwt', token);
    window.sessionStorage.setItem('jwt', token);
}

function clearJWT() {
    if (typeof window === 'undefined') return;
    Cookies.remove('jwt', { path: '/' });
    window.localStorage.removeItem('jwt');
    window.sessionStorage.removeItem('jwt');
}

export { getJWT, setJWT, clearJWT }