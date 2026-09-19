import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../../../core/utils/formatters.dart';
import '../../../../core/widgets/picket_widgets.dart';
import '../../domain/usecases/finance_actions.dart';

/// Shared editor for named amounts: wallets, budgets, and bills.
class AmountEditorScreen extends StatefulWidget {
  const AmountEditorScreen({
    super.key,
    required this.heading,
    required this.onSave,
    this.initialName = '',
    this.initialAmount = 0,
    this.initialDate,
    this.categoryMode = false,
    this.categoryOptions = categories,
    this.allowZero = false,
    this.amountLabel = 'Số tiền',
    this.help,
  });
  final String heading, initialName, amountLabel;
  final String? help;
  final int initialAmount;
  final DateTime? initialDate;
  final bool categoryMode, allowZero;
  final List<String> categoryOptions;
  final Future<void> Function(String name, int amount, DateTime date) onSave;
  @override
  State<AmountEditorScreen> createState() => _AmountEditorScreenState();
}

class _AmountEditorScreenState extends State<AmountEditorScreen> {
  final form = GlobalKey<FormState>();
  late final TextEditingController name, amount;
  late String category;
  late DateTime date;
  bool saving = false;
  @override
  void initState() {
    super.initState();
    name = TextEditingController(text: widget.initialName);
    amount = TextEditingController(
      text: widget.initialAmount == 0 ? '' : widget.initialAmount.toString(),
    );
    category = widget.categoryOptions.contains(widget.initialName)
        ? widget.initialName
        : widget.categoryOptions.first;
    date = widget.initialDate ?? DateTime.now();
  }

  @override
  void dispose() {
    name.dispose();
    amount.dispose();
    super.dispose();
  }

  Future<void> submit() async {
    if (!form.currentState!.validate()) return;
    setState(() => saving = true);
    final saved = await performSave(
      context,
      () => widget.onSave(
        widget.categoryMode ? category : name.text.trim(),
        int.parse(amount.text),
        date,
      ),
    );
    if (!mounted) return;
    if (saved) {
      Navigator.pop(context);
    } else {
      setState(() => saving = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: Text(widget.heading)),
    body: SafeArea(
      child: Form(
        key: form,
        child: ListView(
          padding: const EdgeInsets.all(24),
          children: [
            if (widget.help != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 24),
                child: Text(widget.help!),
              ),
            if (widget.categoryMode)
              DropdownButtonFormField<String>(
                initialValue: category,
                decoration: const InputDecoration(labelText: 'Danh mục'),
                items: widget.categoryOptions
                    .map((c) => DropdownMenuItem(value: c, child: Text(c)))
                    .toList(),
                onChanged: (v) => category = v!,
              )
            else
              TextFormField(
                controller: name,
                decoration: const InputDecoration(labelText: 'Tên'),
                validator: requiredText,
              ),
            const SizedBox(height: 20),
            TextFormField(
              controller: amount,
              decoration: InputDecoration(
                labelText: widget.amountLabel,
                suffixText: 'VND',
              ),
              keyboardType: TextInputType.number,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              validator: (v) => validateMoney(v, allowZero: widget.allowZero),
            ),
            if (widget.initialDate != null)
              Padding(
                padding: const EdgeInsets.only(top: 20),
                child: ListTile(
                  title: const Text('Ngày đến hạn'),
                  trailing: Text(shortDate(date)),
                  leading: const Icon(Icons.calendar_month_outlined),
                  onTap: () async {
                    final value = await showDatePicker(
                      context: context,
                      initialDate: date,
                      firstDate: DateTime(2000),
                      lastDate: DateTime.now().add(const Duration(days: 3650)),
                    );
                    if (value != null && mounted) setState(() => date = value);
                  },
                ),
              ),
            const SizedBox(height: 28),
            FilledButton(
              onPressed: saving ? null : submit,
              child: Text(saving ? 'Đang lưu...' : 'Lưu'),
            ),
          ],
        ),
      ),
    ),
  );
}
