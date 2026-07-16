import Cookies from 'js-cookie'

function getJWT () {
    return Cookies.get('jwt') || window.localStorage.getItem('jwt')
}

function setJWT(token) {
    if (!token) return;
    Cookies.set('jwt', token, { expires: 3650, path: '/', sameSite: 'none', secure: true });
    window.localStorage.setItem('jwt', token);
}

function clearJWT() {
    Cookies.remove('jwt', { path: '/' });
    window.localStorage.removeItem('jwt');
}

export { getJWT, setJWT, clearJWT }