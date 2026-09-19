import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';
import '../../../../core/media/photo_storage.dart';
import '../../../../core/utils/formatters.dart';
import '../../../../core/widgets/picket_widgets.dart';
import '../../domain/entities/finance_data.dart';
import '../../domain/usecases/finance_actions.dart';
import '../state/finance_controller.dart';

class KeepsakeFormScreen extends StatefulWidget {
  const KeepsakeFormScreen({
    super.key,
    required this.controller,
    this.keepsake,
    this.photoPath,
  });
  final FinanceController controller;
  final Keepsake? keepsake;
  final String? photoPath;
  @override
  State<KeepsakeFormScreen> createState() => _KeepsakeFormScreenState();
}

class _KeepsakeFormScreenState extends State<KeepsakeFormScreen> {
  final form = GlobalKey<FormState>();
  late final TextEditingController title, amount, note;
  String? path;
  bool busy = false;
  DateTime? warrantyUntil, returnUntil;
  String category = 'Khác';
  Future<void> pickDeadline(bool warranty) async {
    final date = await showDatePicker(
      context: context,
      initialDate: (warranty ? warrantyUntil : returnUntil) ?? DateTime.now(),
      firstDate: DateTime(2000),
      lastDate: DateTime(2100),
    );
    if (date != null && mounted) {
      setState(() {
        if (warranty) {
          warrantyUntil = date;
        } else {
          returnUntil = date;
        }
      });
    }
  }

  @override
  void initState() {
    super.initState();
    title = TextEditingController(text: widget.keepsake?.title ?? '');
    amount = TextEditingController(
      text: widget.keepsake?.amount.toString() ?? '0',
    );
    note = TextEditingController(text: widget.keepsake?.note ?? '');
    path = widget.photoPath ?? widget.keepsake?.photoPath;
    category = widget.keepsake?.category ?? 'Khác';
    warrantyUntil = widget.keepsake?.warrantyUntil;
    returnUntil = widget.keepsake?.returnUntil;
  }

  @override
  void dispose() {
    title.dispose();
    amount.dispose();
    note.dispose();
    super.dispose();
  }

  Future<void> pick() async {
    setState(() => busy = true);
    try {
      final photo = await PhotoStorage().pick(ImageSource.gallery);
      if (photo != null && mounted) setState(() => path = photo);
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Không đọc được ảnh. Hãy thử lại.')),
        );
      }
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> save() async {
    if (!form.currentState!.validate()) return;
    setState(() => busy = true);
    final item = Keepsake(
      id: widget.keepsake?.id ?? newId(),
      title: title.text.trim(),
      amount: int.parse(amount.text),
      date: widget.keepsake?.date ?? DateTime.now(),
      note: note.text.trim(),
      photoPath: path,
      category: category,
      warrantyUntil: warrantyUntil,
      returnUntil: returnUntil,
    );
    final saved = await performSave(
      context,
      () => widget.controller.update(
        (data) => data.copyWith(
          keepsakes: [...data.keepsakes.where((i) => i.id != item.id), item],
        ),
      ),
    );
    if (!mounted) return;
    if (saved) {
      Navigator.pop(context);
    } else {
      setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: Text(
        widget.keepsake == null ? 'Một món đồ mới' : 'Chỉnh sửa món đồ',
      ),
    ),
    body: SafeArea(
      child: Form(
        key: form,
        child: ListView(
          padding: const EdgeInsets.all(24),
          children: [
            DropdownButtonFormField<String>(
              initialValue: category,
              decoration: const InputDecoration(labelText: 'Danh mục món đồ'),
              items: allCategories(
                widget.controller.data,
              ).map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(),
              onChanged: (v) => category = v!,
            ),
            ListTile(
              title: const Text('Hạn bảo hành'),
              subtitle: Text(
                warrantyUntil == null ? 'Chưa đặt' : shortDate(warrantyUntil!),
              ),
              onTap: () => pickDeadline(true),
              trailing: IconButton(
                tooltip: 'Bỏ hạn bảo hành',
                onPressed: () => setState(() => warrantyUntil = null),
                icon: const Icon(Icons.clear),
              ),
            ),
            ListTile(
              title: const Text('Hạn đổi trả'),
              subtitle: Text(
                returnUntil == null ? 'Chưa đặt' : shortDate(returnUntil!),
              ),
              onTap: () => pickDeadline(false),
              trailing: IconButton(
                tooltip: 'Bỏ hạn đổi trả',
                onPressed: () => setState(() => returnUntil = null),
                icon: const Icon(Icons.clear),
              ),
            ),
            if (path != null)
              ClipRRect(
                borderRadius: BorderRadius.circular(20),
                child: Image.file(
                  File(path!),
                  height: 220,
                  fit: BoxFit.cover,
                  errorBuilder: (_, _, _) =>
                      const Icon(Icons.broken_image_outlined, size: 60),
                ),
              ),
            OutlinedButton.icon(
              onPressed: busy ? null : pick,
              icon: const Icon(Icons.add_photo_alternate_outlined),
              label: const Text('Chọn ảnh món đồ'),
            ),
            const SizedBox(height: 20),
            TextFormField(
              controller: title,
              decoration: const InputDecoration(labelText: 'Tên món đồ'),
              validator: requiredText,
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: amount,
              keyboardType: TextInputType.number,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              decoration: const InputDecoration(
                labelText: 'Giá trị (0 nếu chưa biết)',
                suffixText: 'VND',
              ),
              validator: (value) => validateMoney(value, allowZero: true),
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: note,
              maxLines: 4,
              decoration: const InputDecoration(
                labelText: 'Câu chuyện của món đồ',
              ),
            ),
            const SizedBox(height: 16),
            const Text(
              'Lưu món đồ không tạo khoản chi. Bạn có thể ghi giao dịch riêng để cập nhật số dư.',
            ),
            const SizedBox(height: 24),
            FilledButton(
              onPressed: busy ? null : save,
              child: Text(busy ? 'Đang lưu...' : 'Giữ lại kỷ niệm'),
            ),
          ],
        ),
      ),
    ),
  );
}
