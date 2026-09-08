import { api } from "./Api";

export const GoogleUserInfo = async () => {
  try {
    const res:any = await api.get('/user');
    return res;
  } catch (err) {
    console.error('Error fetching user info:', err);
    return null;
  }
};

export const LogOutUser = async () => {
  try {
    const res: any = await api.post('/user/logout');
    return res;
  } catch (err) {
    console.error('Error while logout:', err);
    throw err;
  }
};