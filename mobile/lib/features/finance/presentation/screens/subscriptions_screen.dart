import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../../../core/utils/formatters.dart';
import '../../../../core/widgets/picket_widgets.dart';
import '../../domain/entities/finance_data.dart';
import '../../domain/usecases/finance_actions.dart';
import '../state/finance_controller.dart';

class SubscriptionsScreen extends StatelessWidget {
  const SubscriptionsScreen({super.key, required this.controller});
  final FinanceController controller;
  void edit(BuildContext context, [SubscriptionPlan? plan]) => Navigator.push(
    context,
    MaterialPageRoute<void>(
      builder: (_) => SubscriptionEditor(controller: controller, plan: plan),
    ),
  );
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: const Text('Thuê bao'),
      actions: [
        IconButton(
          tooltip: 'Thêm thuê bao',
          onPressed: () => edit(context),
          icon: const Icon(Icons.add),
        ),
      ],
    ),
    body: ListenableBuilder(
      listenable: controller,
      builder: (context, _) => ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Text(
            'Ước tính mỗi tháng: ${money(controller.data.subscriptions.where((s) => s.active).fold(0, (sum, s) => sum + (s.amount / s.cycleMonths).round()))}',
            style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 20),
          if (controller.data.subscriptions.isEmpty)
            const EmptyState(
              title: 'Chưa có thuê bao',
              description:
                  'Thêm ứng dụng, dịch vụ hoặc hội viên bạn đang dùng.',
            ),
          for (final plan in controller.data.subscriptions)
            Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: Surface(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    ListTile(
                      contentPadding: EdgeInsets.zero,
                      title: Text(plan.name),
                      subtitle: Text(
                        '${money(plan.amount)} / ${plan.cycleMonths} tháng\nKỳ tới ${shortDate(plan.nextDate)}',
                      ),
                      trailing: IconButton(
                        tooltip: 'Sửa thuê bao',
                        onPressed: () => edit(context, plan),
                        icon: const Icon(Icons.edit_outlined),
                      ),
                    ),
                    if (plan.note.isNotEmpty) Text(plan.note),
                    Text(
                      plan.active
                          ? 'Đang hoạt động · nhắc trước ${plan.alertDays} ngày'
                          : 'Đã tạm dừng',
                    ),
                    const SizedBox(height: 12),
                    if (plan.active)
                      FilledButton(
                        onPressed: controller.saving
                            ? null
                            : () async {
                                final wallet =
                                    await showModalBottomSheet<String>(
                                      context: context,
                                      showDragHandle: true,
                                      builder: (context) => SafeArea(
                                        child: ListView(
                                          shrinkWrap: true,
                                          children: [
                                            for (final w
                                                in controller.data.wallets)
                                              ListTile(
                                                title: Text(w.name),
                                                subtitle: Text(
                                                  money(
                                                    walletBalance(
                                                      controller.data,
                                                      w,
                                                    ),
                                                  ),
                                                ),
                                                onTap: () => Navigator.pop(
                                                  context,
                                                  w.id,
                                                ),
                                              ),
                                          ],
                                        ),
                                      ),
                                    );
                                if (wallet != null && context.mounted) {
                                  await performSave(
                                    context,
                                    () => controller.update(
                                      (data) => controller.actions
                                          .paySubscription(data, plan, wallet),
                                    ),
                                  );
                                }
                              },
                        child: const Text('Đã trả · chuyển kỳ tiếp theo'),
                      ),
                  ],
                ),
              ),
            ),
        ],
      ),
    ),
  );
}

class SubscriptionEditor extends StatefulWidget {
  const SubscriptionEditor({super.key, required this.controller, this.plan});
  final FinanceController controller;
  final SubscriptionPlan? plan;
  @override
  State<SubscriptionEditor> createState() => _SubscriptionEditorState();
}

class _SubscriptionEditorState extends State<SubscriptionEditor> {
  final form = GlobalKey<FormState>();
  late final TextEditingController name, amount, note;
  late DateTime date;
  late int cycle, alertDays;
  late bool active;
  bool busy = false;
  @override
  void initState() {
    super.initState();
    final p = widget.plan;
    name = TextEditingController(text: p?.name ?? '');
    amount = TextEditingController(text: p?.amount.toString() ?? '');
    note = TextEditingController(text: p?.note ?? '');
    date = p?.nextDate ?? DateTime.now();
    cycle = p?.cycleMonths ?? 1;
    alertDays = p?.alertDays ?? 3;
    active = p?.active ?? true;
  }

  @override
  void dispose() {
    name.dispose();
    amount.dispose();
    note.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Thông tin thuê bao')),
    body: SafeArea(
      child: Form(
        key: form,
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            TextFormField(
              controller: name,
              decoration: const InputDecoration(labelText: 'Tên dịch vụ'),
              validator: requiredText,
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: amount,
              decoration: const InputDecoration(
                labelText: 'Số tiền mỗi kỳ',
                suffixText: 'VND',
              ),
              keyboardType: TextInputType.number,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              validator: validateMoney,
            ),
            const SizedBox(height: 16),
            DropdownButtonFormField<int>(
              initialValue: cycle,
              decoration: const InputDecoration(labelText: 'Chu kỳ'),
              items: const [
                DropdownMenuItem(value: 1, child: Text('Hàng tháng')),
                DropdownMenuItem(value: 3, child: Text('Mỗi quý')),
                DropdownMenuItem(value: 12, child: Text('Hàng năm')),
              ],
              onChanged: (v) => cycle = v!,
            ),
            const SizedBox(height: 16),
            ListTile(
              title: const Text('Kỳ thanh toán tiếp'),
              trailing: Text(shortDate(date)),
              onTap: () async {
                final selected = await showDatePicker(
                  context: context,
                  initialDate: date,
                  firstDate: DateTime(2000),
                  lastDate: DateTime(2100),
                );
                if (selected != null && mounted) {
                  setState(() => date = selected);
                }
              },
            ),
            DropdownButtonFormField<int>(
              initialValue: alertDays,
              decoration: const InputDecoration(labelText: 'Nhắc trước'),
              items: [
                for (final d in [0, 1, 3, 7])
                  DropdownMenuItem(value: d, child: Text('$d ngày')),
              ],
              onChanged: (v) => alertDays = v!,
            ),
            SwitchListTile(
              title: const Text('Đang hoạt động'),
              value: active,
              onChanged: (v) => setState(() => active = v),
            ),
            TextFormField(
              controller: note,
              decoration: const InputDecoration(
                labelText: 'Ghi chú / thời gian dùng thử',
              ),
              maxLines: 3,
            ),
            const SizedBox(height: 20),
            FilledButton(
              onPressed: busy
                  ? null
                  : () async {
                      if (!form.currentState!.validate()) return;
                      setState(() => busy = true);
                      final plan = SubscriptionPlan(
                        id: widget.plan?.id ?? newId(),
                        name: name.text.trim(),
                        amount: int.parse(amount.text),
                        nextDate: date,
                        cycleMonths: cycle,
                        active: active,
                        note: note.text.trim(),
                        alertDays: alertDays,
                      );
                      final ok = await performSave(
                        context,
                        () => widget.controller.update(
                          (data) => data.copyWith(
                            subscriptions: [
                              ...data.subscriptions.where(
                                (s) => s.id != plan.id,
                              ),
                              plan,
                            ],
                          ),
                        ),
                      );
                      if (!context.mounted) return;
                      if (ok) {
                        Navigator.pop(context);
                      } else {
                        setState(() => busy = false);
                      }
                    },
              child: const Text('Lưu thuê bao'),
            ),
            if (widget.plan != null)
              TextButton(
                onPressed: busy
                    ? null
                    : () async {
                        if (!await confirmDelete(
                          context,
                          'Xoá lịch thuê bao? Các khoản chi cũ vẫn được giữ.',
                        )) {
                          return;
                        }
                        if (!context.mounted) return;
                        final ok = await performSave(
                          context,
                          () => widget.controller.update(
                            (data) => data.copyWith(
                              subscriptions: data.subscriptions
                                  .where((s) => s.id != widget.plan!.id)
                                  .toList(),
                            ),
                          ),
                        );
                        if (ok && context.mounted) Navigator.pop(context);
                      },
                child: const Text('Xoá thuê bao'),
              ),
          ],
        ),
      ),
    ),
  );
}
