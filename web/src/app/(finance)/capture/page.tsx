import { requireApiSession } from '@/core/auth/require-api-session';
import { FinancePageHeader } from '../finance-ui';
import { CaptureForm } from './capture-form';
export default async function CapturePage(){const {claims}=await requireApiSession();return <><FinancePageHeader title="Lưu hóa đơn" description="Chụp hoặc chọn ảnh, kiểm tra nội dung rồi lưu vào bộ sưu tập riêng của bạn."/><CaptureForm owner={String(claims.sub)}/></>;}
