import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../../../core/utils/formatters.dart';
import '../../../../core/widgets/picket_widgets.dart';
import '../../domain/entities/finance_data.dart';
import '../../domain/usecases/finance_actions.dart';
import '../state/finance_controller.dart';

class EntryFormScreen extends StatefulWidget {
  const EntryFormScreen({
    super.key,
    required this.controller,
    this.entry,
    this.receiptPath,
    this.initialType = EntryType.expense,
    this.suggestedTitle,
    this.suggestedAmount,
    this.suggestedDate,
  });
  final FinanceController controller;
  final Entry? entry;
  final String? receiptPath;
  final EntryType initialType;
  final String? suggestedTitle;
  final int? suggestedAmount;
  final DateTime? suggestedDate;
  @override
  State<EntryFormScreen> createState() => _EntryFormScreenState();
}

class _EntryFormScreenState extends State<EntryFormScreen> {
  final form = GlobalKey<FormState>();
  late final TextEditingController title, amount, note;
  late EntryType type;
  late DateTime date;
  late String walletId, category;
  String? destinationId;
  bool saving = false;
  List<String> get availableCategories => allCategories(widget.controller.data);
  @override
  void initState() {
    super.initState();
    final e = widget.entry;
    title = TextEditingController(
      text: e?.title ?? widget.suggestedTitle ?? '',
    );
    amount = TextEditingController(
      text: e?.amount.toString() ?? widget.suggestedAmount?.toString() ?? '',
    );
    note = TextEditingController(text: e?.note ?? '');
    type = e?.type ?? widget.initialType;
    date = e?.date ?? widget.suggestedDate ?? DateTime.now();
    walletId = e?.walletId ?? widget.controller.data.wallets.first.id;
    category = (e != null && availableCategories.contains(e.category))
        ? e.category
        : (type == EntryType.income ? 'Lương' : availableCategories.first);
    destinationId = e?.destinationId;
  }

  @override
  void dispose() {
    title.dispose();
    amount.dispose();
    note.dispose();
    super.dispose();
  }

  Future<void> submit() async {
    if (!form.currentState!.validate()) return;
    setState(() => saving = true);
    final entry = Entry(
      id: widget.entry?.id ?? newId(),
      title: title.text.trim(),
      amount: int.parse(amount.text),
      type: type,
      walletId: walletId,
      category: type == EntryType.transfer ? 'Chuyển ví' : category,
      date: date,
      destinationId: type == EntryType.transfer ? destinationId : null,
      note: note.text.trim(),
      receiptPath: widget.receiptPath ?? widget.entry?.receiptPath,
      refundOf: widget.entry?.refundOf,
      parts: widget.entry?.parts ?? const [],
      reconciled: widget.entry?.reconciled ?? false,
      reconciledWalletIds: widget.entry?.reconciledWalletIds ?? const [],
    );
    final saved = await performSave(
      context,
      () => widget.controller.saveEntry(entry),
    );
    if (!mounted) return;
    if (saved) {
      Navigator.pop(context);
    } else {
      setState(() => saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final wallets = widget.controller.data.wallets;
    final receipt = widget.receiptPath ?? widget.entry?.receiptPath;
    return Scaffold(
      appBar: AppBar(
        title: Text(
          widget.entry == null ? 'Ghi một giao dịch' : 'Chỉnh sửa giao dịch',
        ),
      ),
      body: SafeArea(
        child: Form(
          key: form,
          child: ListView(
            padding: const EdgeInsets.all(20),
            children: [
              SegmentedButton<EntryType>(
                segments: const [
                  ButtonSegment(
                    value: EntryType.expense,
                    label: Text('Chi tiêu'),
                  ),
                  ButtonSegment(
                    value: EntryType.income,
                    label: Text('Thu nhập'),
                  ),
                  ButtonSegment(
                    value: EntryType.transfer,
                    label: Text('Chuyển ví'),
                  ),
                ],
                selected: {type},
                onSelectionChanged: saving
                    ? null
                    : (selection) => setState(() => type = selection.first),
              ),
              const SizedBox(height: 24),
              TextFormField(
                controller: amount,
                autofocus: widget.entry == null,
                keyboardType: TextInputType.number,
                inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                style: const TextStyle(
                  fontSize: 30,
                  fontWeight: FontWeight.bold,
                ),
                decoration: const InputDecoration(
                  labelText: 'Số tiền',
                  suffixText: 'VND',
                ),
                validator: validateMoney,
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: title,
                decoration: const InputDecoration(
                  labelText: 'Tên giao dịch',
                  hintText: 'Ví dụ: Cà phê sáng',
                ),
                validator: requiredText,
              ),
              const SizedBox(height: 16),
              DropdownButtonFormField<String>(
                initialValue: walletId,
                decoration: InputDecoration(
                  labelText: type == EntryType.transfer
                      ? 'Từ ví'
                      : 'Ví thanh toán',
                ),
                items: wallets
                    .map(
                      (w) => DropdownMenuItem(value: w.id, child: Text(w.name)),
                    )
                    .toList(),
                onChanged: (v) => setState(() {
                  walletId = v!;
                  if (destinationId == v) destinationId = null;
                }),
              ),
              const SizedBox(height: 16),
              if (type == EntryType.transfer)
                DropdownButtonFormField<String>(
                  key: ValueKey(walletId),
                  initialValue: destinationId,
                  decoration: const InputDecoration(labelText: 'Đến ví'),
                  items: wallets
                      .where((w) => w.id != walletId)
                      .map(
                        (w) =>
                            DropdownMenuItem(value: w.id, child: Text(w.name)),
                      )
                      .toList(),
                  onChanged: (v) => setState(() => destinationId = v),
                  validator: (v) => v == null || v == walletId
                      ? 'Chọn một ví khác để nhận tiền'
                      : null,
                )
              else
                DropdownButtonFormField<String>(
                  initialValue: availableCategories.contains(category)
                      ? category
                      : availableCategories.first,
                  decoration: const InputDecoration(labelText: 'Danh mục'),
                  items: availableCategories
                      .map((c) => DropdownMenuItem(value: c, child: Text(c)))
                      .toList(),
                  onChanged: (v) => category = v!,
                ),
              const SizedBox(height: 16),
              ListTile(
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
                tileColor: Colors.white,
                leading: const Icon(Icons.calendar_today_outlined),
                title: const Text('Ngày giao dịch'),
                trailing: Text(shortDate(date)),
                onTap: () async {
                  final picked = await showDatePicker(
                    context: context,
                    initialDate: date,
                    firstDate: DateTime(2000),
                    lastDate: DateTime.now().add(const Duration(days: 3650)),
                  );
                  if (picked != null && mounted) setState(() => date = picked);
                },
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: note,
                maxLines: 3,
                decoration: const InputDecoration(
                  labelText: 'Ghi chú (tuỳ chọn)',
                ),
              ),
              if (receipt != null)
                Padding(
                  padding: const EdgeInsets.only(top: 16),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(16),
                    child: Image.file(
                      File(receipt),
                      height: 220,
                      fit: BoxFit.contain,
                      errorBuilder: (_, _, _) =>
                          const Text('Ảnh không còn trên thiết bị.'),
                    ),
                  ),
                ),
              const SizedBox(height: 24),
              FilledButton(
                onPressed: saving ? null : submit,
                child: Text(saving ? 'Đang lưu...' : 'Lưu giao dịch'),
              ),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }
}
