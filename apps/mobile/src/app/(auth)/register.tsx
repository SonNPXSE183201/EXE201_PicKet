import {router} from 'expo-router';
import {AuthScreen,TextLink} from '@/features/auth/auth-screen';
import {routes} from '@/core/navigation/routes';
export default function RegisterScreen(){
 return <AuthScreen title="Đăng ký bằng số điện thoại" subtitle="Đăng ký tài khoản mới chưa sẵn sàng. Vui lòng quay lại sau."><TextLink label="Đã có tài khoản? Đăng nhập" onPress={()=>router.replace(routes.login)}/></AuthScreen>;
}
