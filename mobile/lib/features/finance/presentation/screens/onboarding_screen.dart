import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../../core/config/app_config.dart';
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
  static const _stepCount = 8;

  final _name = TextEditingController();
  final _wallet = TextEditingController(text: 'Tiền mặt');
  final _balance = TextEditingController(text: '0');
  final _fieldKey = GlobalKey<FormState>();

  int _step = 0;
  bool _saving = false;
  bool _privacyAccepted = false;
  String _goal = 'Hiểu chi tiêu';
  String _persona = 'Đi làm';
  String _currency = 'VND';

  @override
  void dispose() {
    _name.dispose();
    _wallet.dispose();
    _balance.dispose();
    super.dispose();
  }

  bool _validateStep() {
    if (_step == 1 || _step == 5 || _step == 6) {
      return _fieldKey.currentState?.validate() ?? false;
    }
    if (_step == 7 && !_privacyAccepted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Bạn cần xác nhận chính sách dữ liệu để tiếp tục.'),
        ),
      );
      return false;
    }
    return true;
  }

  Future<void> _next() async {
    if (!_validateStep()) return;
    if (_step < _stepCount - 1) {
      setState(() => _step++);
      return;
    }
    await _submit();
  }

  Future<void> _submit() async {
    setState(() => _saving = true);
    final openingBalance = int.parse(_balance.text);
    final saved = await performSave(context, () async {
      if (AppConfig.configured) {
        await Supabase.instance.client.rpc(
          'complete_onboarding',
          params: {
            'display_name': _name.text.trim(),
            'persona': _persona,
            'goal': _goal,
            'currency_code': _currency,
            'wallet_name': _wallet.text.trim(),
            'opening_balance': openingBalance,
          },
        );
      }
      await widget.controller.update(
        (data) => data.copyWith(
          name: _name.text.trim(),
          onboarded: true,
          preferences: {
            ...data.preferences,
            'goal': _goal,
            'persona': _persona,
            'currency': _currency,
          },
          wallets: [
            Wallet(
              id: newId(),
              name: _wallet.text.trim(),
              openingBalance: openingBalance,
            ),
          ],
        ),
      );
    });
    if (mounted && !saved) setState(() => _saving = false);
  }

  void _back() {
    if (_saving || _step == 0) return;
    setState(() => _step--);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 560),
            child: Column(
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(24, 18, 24, 0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Row(
                        children: [
                          if (_step > 0)
                            IconButton(
                              tooltip: 'Quay lại',
                              onPressed: _saving ? null : _back,
                              icon: const Icon(Icons.arrow_back),
                            )
                          else
                            const SizedBox(width: 48),
                          Expanded(
                            child: Text(
                              'Thiết lập ${_step + 1}/$_stepCount',
                              textAlign: TextAlign.center,
                              style: Theme.of(context).textTheme.labelLarge,
                            ),
                          ),
                          const SizedBox(width: 48),
                        ],
                      ),
                      const SizedBox(height: 8),
                      LinearProgressIndicator(value: (_step + 1) / _stepCount),
                    ],
                  ),
                ),
                Expanded(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.all(28),
                    child: Form(key: _fieldKey, child: _stepContent(context)),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(28, 8, 28, 24),
                  child: SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      key: const Key('onboarding-next'),
                      onPressed: _saving ? null : _next,
                      child: Text(
                        _saving
                            ? 'Đang chuẩn bị...'
                            : _step == _stepCount - 1
                            ? 'Bắt đầu cùng Picket'
                            : 'Tiếp tục',
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _stepContent(BuildContext context) {
    final titleStyle = Theme.of(context).textTheme.headlineMedium?.copyWith(
      fontWeight: FontWeight.w800,
      height: 1.15,
    );
    return switch (_step) {
      0 => _StepBody(
        icon: Icons.camera_alt_outlined,
        title: 'Giữ từng chi tiêu.\nGom từng kỷ niệm.',
        description:
            'Picket giúp bạn quét hóa đơn, hiểu dòng tiền và lưu lại những điều đáng nhớ trong cùng một nơi.',
        titleStyle: titleStyle,
      ),
      1 => _StepBody(
        icon: Icons.waving_hand_outlined,
        title: 'Mình gọi bạn là gì?',
        description: 'Tên này chỉ dùng để cá nhân hóa trải nghiệm của bạn.',
        titleStyle: titleStyle,
        child: TextFormField(
          key: const Key('onboarding-name'),
          controller: _name,
          autofocus: true,
          textCapitalization: TextCapitalization.words,
          decoration: const InputDecoration(labelText: 'Tên hiển thị'),
          validator: requiredText,
        ),
      ),
      2 => _StepBody(
        icon: Icons.person_outline,
        title: 'Nhịp sống của bạn',
        description: 'Chọn lựa gần nhất để Picket đưa ra gợi ý phù hợp.',
        titleStyle: titleStyle,
        child: DropdownButtonFormField<String>(
          initialValue: _persona,
          decoration: const InputDecoration(labelText: 'Nhóm phù hợp'),
          items: const ['Đi làm', 'Sinh viên', 'Tự do', 'Gia đình']
              .map(
                (value) => DropdownMenuItem(value: value, child: Text(value)),
              )
              .toList(),
          onChanged: (value) => setState(() => _persona = value!),
        ),
      ),
      3 => _StepBody(
        icon: Icons.flag_outlined,
        title: 'Bạn muốn cải thiện điều gì?',
        description:
            'Picket sẽ ưu tiên các thông tin liên quan tới mục tiêu này.',
        titleStyle: titleStyle,
        child: DropdownButtonFormField<String>(
          initialValue: _goal,
          decoration: const InputDecoration(labelText: 'Mục tiêu chính'),
          items: const ['Hiểu chi tiêu', 'Tiết kiệm', 'Quản lý hóa đơn']
              .map(
                (value) => DropdownMenuItem(value: value, child: Text(value)),
              )
              .toList(),
          onChanged: (value) => setState(() => _goal = value!),
        ),
      ),
      4 => _StepBody(
        icon: Icons.payments_outlined,
        title: 'Đơn vị tiền tệ',
        description: 'Bạn có thể thay đổi lựa chọn này sau trong phần cài đặt.',
        titleStyle: titleStyle,
        child: DropdownButtonFormField<String>(
          initialValue: _currency,
          decoration: const InputDecoration(labelText: 'Tiền tệ mặc định'),
          items: const [
            DropdownMenuItem(value: 'VND', child: Text('VND — Việt Nam đồng')),
            DropdownMenuItem(value: 'USD', child: Text('USD — Đô la Mỹ')),
          ],
          onChanged: (value) => setState(() => _currency = value!),
        ),
      ),
      5 => _StepBody(
        icon: Icons.account_balance_wallet_outlined,
        title: 'Tạo ví đầu tiên',
        description:
            'Ví có thể là tiền mặt, tài khoản ngân hàng hoặc một quỹ riêng.',
        titleStyle: titleStyle,
        child: TextFormField(
          key: const Key('onboarding-wallet'),
          controller: _wallet,
          autofocus: true,
          decoration: const InputDecoration(labelText: 'Tên ví'),
          validator: requiredText,
        ),
      ),
      6 => _StepBody(
        icon: Icons.savings_outlined,
        title: 'Số dư hiện tại',
        description: 'Nhập số dư để báo cáo bắt đầu đúng từ hôm nay.',
        titleStyle: titleStyle,
        child: TextFormField(
          key: const Key('onboarding-balance'),
          controller: _balance,
          autofocus: true,
          keyboardType: TextInputType.number,
          inputFormatters: [FilteringTextInputFormatter.digitsOnly],
          decoration: InputDecoration(
            labelText: 'Số dư ban đầu',
            suffixText: _currency,
          ),
          validator: (value) => validateMoney(value, allowZero: true),
        ),
      ),
      _ => _StepBody(
        icon: Icons.verified_user_outlined,
        title: 'Sẵn sàng bắt đầu',
        description:
            '${_name.text.trim()}, bạn sẽ bắt đầu với ví “${_wallet.text.trim()}” và mục tiêu “$_goal”.',
        titleStyle: titleStyle,
        child: Column(
          children: [
            CheckboxListTile(
              contentPadding: EdgeInsets.zero,
              value: _privacyAccepted,
              onChanged: _saving
                  ? null
                  : (value) =>
                        setState(() => _privacyAccepted = value ?? false),
              controlAffinity: ListTileControlAffinity.leading,
              title: const Text(
                'Tôi hiểu dữ liệu tài chính sẽ được lưu và đồng bộ an toàn theo cài đặt của mình.',
              ),
            ),
            const SizedBox(height: 12),
            const Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(Icons.lock_outline, size: 18, color: PicketColors.muted),
                SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Camera chỉ được sử dụng khi bạn chủ động quét hóa đơn. Bạn có thể quản lý đồng bộ và thông báo trong Cài đặt.',
                    style: TextStyle(color: PicketColors.muted, height: 1.5),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    };
  }
}

class _StepBody extends StatelessWidget {
  const _StepBody({
    required this.icon,
    required this.title,
    required this.description,
    required this.titleStyle,
    this.child,
  });

  final IconData icon;
  final String title;
  final String description;
  final TextStyle? titleStyle;
  final Widget? child;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Align(
          alignment: Alignment.centerLeft,
          child: CircleAvatar(
            radius: 34,
            backgroundColor: PicketColors.peach,
            child: Icon(icon, color: PicketColors.ink, size: 34),
          ),
        ),
        const SizedBox(height: 28),
        Text(title, style: titleStyle),
        const SizedBox(height: 14),
        Text(
          description,
          style: const TextStyle(color: PicketColors.muted, height: 1.6),
        ),
        if (child != null) ...[const SizedBox(height: 28), child!],
      ],
    );
  }
}
