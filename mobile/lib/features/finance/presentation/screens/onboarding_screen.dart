import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../../../core/theme/picket_theme.dart';
import '../../../../core/utils/formatters.dart';
import '../../../../core/widgets/picket_widgets.dart';
import '../../domain/entities/finance_data.dart';
import '../../domain/usecases/finance_actions.dart';
import '../state/finance_controller.dart';

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key, required this.controller});
  final FinanceController controller;
  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final form = GlobalKey<FormState>();
  final name = TextEditingController();
  final wallet = TextEditingController(text: 'Tiền mặt');
  final balance = TextEditingController(text: '0');
  bool saving = false;
  String goal = 'Hiểu chi tiêu', persona = 'Đi làm';
  @override
  void dispose() {
    name.dispose();
    wallet.dispose();
    balance.dispose();
    super.dispose();
  }

  Future<void> submit() async {
    if (!form.currentState!.validate()) return;
    setState(() => saving = true);
    await performSave(
      context,
      () => widget.controller.update(
        (data) => data.copyWith(
          name: name.text.trim(),
          onboarded: true,
          preferences: {...data.preferences, 'goal': goal, 'persona': persona},
          wallets: [
            Wallet(
              id: newId(),
              name: wallet.text.trim(),
              openingBalance: int.parse(balance.text),
            ),
          ],
        ),
      ),
    );
    if (mounted) setState(() => saving = false);
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    body: SafeArea(
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 520),
          child: ListView(
            padding: const EdgeInsets.all(28),
            children: [
              const SizedBox(height: 28),
              const Align(
                alignment: Alignment.centerLeft,
                child: CircleAvatar(
                  radius: 36,
                  backgroundColor: PicketColors.peach,
                  child: Icon(
                    Icons.camera_alt_outlined,
                    color: PicketColors.ink,
                    size: 36,
                  ),
                ),
              ),
              const SizedBox(height: 24),
              const Text(
                'picket.',
                style: TextStyle(
                  fontSize: 42,
                  fontWeight: FontWeight.w800,
                  letterSpacing: -2,
                ),
              ),
              const SizedBox(height: 12),
              const Text(
                'Giữ từng chi tiêu.\nGom từng kỷ niệm.',
                style: TextStyle(
                  fontSize: 30,
                  fontWeight: FontWeight.w700,
                  height: 1.2,
                ),
              ),
              const SizedBox(height: 16),
              const Text(
                'Một góc nhỏ cho tiền bạc và những điều bạn yêu. Bắt đầu với chiếc ví đầu tiên của bạn.',
                style: TextStyle(color: PicketColors.muted, height: 1.6),
              ),
              const SizedBox(height: 28),
              Form(
                key: form,
                child: Column(
                  children: [
                    TextFormField(
                      controller: name,
                      decoration: const InputDecoration(
                        labelText: 'Mình gọi bạn là gì?',
                      ),
                      textCapitalization: TextCapitalization.words,
                      validator: requiredText,
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: wallet,
                      decoration: const InputDecoration(
                        labelText: 'Tên ví đầu tiên',
                      ),
                      validator: requiredText,
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: balance,
                      decoration: const InputDecoration(
                        labelText: 'Số dư ban đầu',
                        suffixText: 'VND',
                      ),
                      keyboardType: TextInputType.number,
                      inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                      validator: (v) => validateMoney(v, allowZero: true),
                    ),
                    const SizedBox(height: 16),
                    DropdownButtonFormField<String>(
                      initialValue: goal,
                      decoration: const InputDecoration(
                        labelText: 'Điều bạn muốn cải thiện',
                      ),
                      items:
                          const [
                                'Hiểu chi tiêu',
                                'Tiết kiệm',
                                'Quản lý hóa đơn',
                              ]
                              .map(
                                (v) =>
                                    DropdownMenuItem(value: v, child: Text(v)),
                              )
                              .toList(),
                      onChanged: (v) => goal = v!,
                    ),
                    const SizedBox(height: 16),
                    DropdownButtonFormField<String>(
                      initialValue: persona,
                      decoration: const InputDecoration(
                        labelText: 'Nhịp sống của bạn',
                      ),
                      items: const ['Đi làm', 'Sinh viên', 'Tự do', 'Gia đình']
                          .map(
                            (v) => DropdownMenuItem(value: v, child: Text(v)),
                          )
                          .toList(),
                      onChanged: (v) => persona = v!,
                    ),
                    const SizedBox(height: 24),
                    SizedBox(
                      width: double.infinity,
                      child: FilledButton(
                        onPressed: saving ? null : submit,
                        child: Text(
                          saving ? 'Đang chuẩn bị...' : 'Bắt đầu cùng Picket',
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),
              const Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(Icons.lock_outline, size: 18, color: PicketColors.muted),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Dữ liệu tài chính được mã hóa trên thiết bị. Bạn có thể quản lý đồng bộ, thông báo và bản sao lưu trong phần cài đặt. Camera chỉ được dùng khi bạn chọn chụp ảnh.',
                      style: TextStyle(
                        fontSize: 12,
                        color: PicketColors.muted,
                        height: 1.5,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    ),
  );
}
