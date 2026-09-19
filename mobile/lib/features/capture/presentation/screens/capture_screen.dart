import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../../data/receipt_ocr.dart';
import '../../domain/receipt_parser.dart';
import '../../../../core/media/photo_storage.dart';
import '../../../../core/theme/picket_theme.dart';
import '../../../../core/widgets/picket_widgets.dart';
import '../../../finance/presentation/state/finance_controller.dart';
import '../../../finance/presentation/screens/entry_form_screen.dart';
import '../../../finance/presentation/screens/keepsake_form_screen.dart';

class CaptureScreen extends StatefulWidget {
  const CaptureScreen({
    super.key,
    required this.controller,
    this.recoveredPath,
  });
  final FinanceController controller;
  final String? recoveredPath;
  @override
  State<CaptureScreen> createState() => _CaptureScreenState();
}

class _CaptureScreenState extends State<CaptureScreen> {
  String? path, error;
  bool busy = false;
  bool keepsake = false;
  ReceiptDraft? draft;
  Future<void> recognize() async {
    if (path == null) return;
    setState(() {
      busy = true;
      error = null;
    });
    try {
      final result = await ReceiptOcr().read(path!);
      if (mounted) setState(() => draft = result);
    } catch (_) {
      if (mounted) {
        setState(
          () => error =
              'Chưa đọc được hoá đơn. Bạn vẫn có thể nhập tay hoặc chụp lại.',
        );
      }
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  void initState() {
    super.initState();
    path = widget.recoveredPath;
  }

  Future<void> pick(ImageSource source) async {
    setState(() {
      busy = true;
      error = null;
    });
    try {
      final selected = await PhotoStorage().pick(source);
      if (selected != null && mounted) {
        setState(() {
          path = selected;
          draft = null;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(
          () => error =
              'Không mở được ảnh. Hãy kiểm tra quyền camera hoặc chọn ảnh từ thư viện.',
        );
      }
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Ghi lại một điều nhỏ')),
    body: SafeArea(
      child: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          SegmentedButton<bool>(
            segments: const [
              ButtonSegment(
                value: false,
                label: Text('Hoá đơn'),
                icon: Icon(Icons.receipt_long_outlined),
              ),
              ButtonSegment(
                value: true,
                label: Text('Món đồ'),
                icon: Icon(Icons.shopping_bag_outlined),
              ),
            ],
            selected: {keepsake},
            onSelectionChanged: (value) =>
                setState(() => keepsake = value.first),
          ),
          const SizedBox(height: 24),
          if (path != null)
            ClipRRect(
              borderRadius: BorderRadius.circular(24),
              child: Image.file(
                File(path!),
                height: 330,
                fit: BoxFit.contain,
                errorBuilder: (_, _, _) => const EmptyState(
                  title: 'Không đọc được ảnh',
                  description: 'Vui lòng chọn một ảnh khác.',
                ),
              ),
            )
          else
            Container(
              height: 310,
              decoration: BoxDecoration(
                color: PicketColors.peach.withValues(alpha: 0.45),
                borderRadius: BorderRadius.circular(28),
                border: Border.all(color: PicketColors.coral),
              ),
              child: const Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.document_scanner_outlined,
                    size: 72,
                    color: PicketColors.mauve,
                  ),
                  SizedBox(height: 24),
                  Text(
                    'Chụp rõ, giữ trọn kỷ niệm',
                    style: TextStyle(fontSize: 19, fontWeight: FontWeight.bold),
                  ),
                  SizedBox(height: 8),
                  Text('Đặt hoá đơn trên nền phẳng, đủ sáng.'),
                ],
              ),
            ),
          const SizedBox(height: 20),
          if (error != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: Text(
                error!,
                style: const TextStyle(color: PicketColors.expense),
              ),
            ),
          FilledButton.icon(
            onPressed: busy ? null : () => pick(ImageSource.camera),
            icon: const Icon(Icons.camera_alt_outlined),
            label: Text(busy ? 'Đang mở...' : 'Chụp ảnh'),
          ),
          const SizedBox(height: 12),
          OutlinedButton.icon(
            onPressed: busy ? null : () => pick(ImageSource.gallery),
            icon: const Icon(Icons.photo_library_outlined),
            label: const Text('Chọn từ thư viện'),
          ),
          const SizedBox(height: 20),
          Text(
            keepsake
                ? 'Ảnh và ghi chú thuộc không gian riêng tư của bạn.'
                : 'OCR chạy trên thiết bị. Kiểm tra lại tên cửa hàng, ngày và tổng tiền trước khi lưu.',
            style: const TextStyle(color: PicketColors.muted, height: 1.5),
          ),
          if (path != null && !keepsake) ...[
            OutlinedButton.icon(
              onPressed: busy ? null : recognize,
              icon: const Icon(Icons.document_scanner_outlined),
              label: Text(
                busy ? 'Đang nhận diện...' : 'Đọc thông tin bằng OCR',
              ),
            ),
            if (draft != null)
              ExpansionTile(
                title: Text(
                  draft!.amount == null
                      ? 'Cần nhập tổng tiền thủ công'
                      : 'Đã đọc được tổng tiền · cần xác nhận',
                ),
                children: [
                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: SelectableText(
                      draft!.rawText.isEmpty
                          ? 'Không nhận diện được chữ.'
                          : draft!.rawText,
                    ),
                  ),
                ],
              ),
          ],
          if (path != null)
            Padding(
              padding: const EdgeInsets.only(top: 20),
              child: FilledButton(
                onPressed: busy
                    ? null
                    : () => Navigator.pushReplacement(
                        context,
                        MaterialPageRoute<void>(
                          builder: (_) => keepsake
                              ? KeepsakeFormScreen(
                                  controller: widget.controller,
                                  photoPath: path,
                                )
                              : EntryFormScreen(
                                  controller: widget.controller,
                                  receiptPath: path,
                                  suggestedTitle: draft?.merchant,
                                  suggestedAmount: draft?.amount,
                                  suggestedDate: draft?.date,
                                ),
                        ),
                      ),
                child: Text(
                  keepsake ? 'Lưu vào bộ sưu tập' : 'Nhập thông tin hoá đơn',
                ),
              ),
            ),
        ],
      ),
    ),
  );
}
