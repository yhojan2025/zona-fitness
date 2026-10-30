import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CartService } from '../../core/cart.service';
import { AuthService } from '../../core/auth.service';
import { BankAccount, Order } from '../../core/models';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './checkout.html',
  styleUrls: ['./checkout.css'],
})
export class Checkout implements OnInit {
  readonly cartService = inject(CartService);
  readonly auth = inject(AuthService);
  private router = inject(Router);

  selectedPaymentMethod: string = 'transferencia';
  notes: string = '';
  isSubmitting: boolean = false;
  createdOrder: Order | null = null;
  simulatedPurchaseResult: any = null;
  transferResult: any = null;
  errorMessage: string | null = null;
  informationalAlert: string | null = null;

  // Cuentas bancarias oficiales y comprobante
  bankAccounts: BankAccount[] = [];
  defaultFallbackAccounts: BankAccount[] = [
    {
      id: 1,
      bank_name: 'Bancolombia',
      account_type: 'Ahorros',
      account_number: '742-983421-15',
      account_holder: 'ZONA FITNESS S.A.S.',
      document_type: 'NIT',
      document_number: '901.876.543-2',
      is_active: true,
      instructions: 'Envía el comprobante con la referencia visible',
    },
    {
      id: 2,
      bank_name: 'Nequi / Daviplata',
      account_type: 'Billetera Digital',
      account_number: '312 849 5521',
      account_holder: 'ZONA FITNESS S.A.S.',
      document_type: 'NIT',
      document_number: '901.876.543-2',
      is_active: true,
      instructions: 'Indica en el mensaje de la app tu nombre completo',
    },
  ];
  selectedBankAccountId: number | null = 1;
  selectedFile: File | null = null;
  receiptPreviewUrl: string | null = null;
  fileError: string | null = null;

  ngOnInit() {
    if (!this.auth.isLoggedIn()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: '/checkout' } });
      return;
    }
    this.cartService.loadCart().subscribe((c) => {
      if (c.item_count === 0 && !this.createdOrder) {
        this.router.navigate(['/carrito']);
      }
    });

    this.cartService.getBankAccounts().subscribe({
      next: (accounts) => {
        this.bankAccounts = accounts.filter((a) => a.is_active);
        if (this.bankAccounts.length > 0) {
          this.selectedBankAccountId = this.bankAccounts[0].id;
        }
      },
      error: () => {
        // En caso de no cargar, la vista muestra las cuentas de respaldo oficiales
      },
    });
  }

  handleOnlinePaymentClick(gatewayName: string) {
    this.informationalAlert = `Los pagos automáticos en línea mediante ${gatewayName} estarán disponibles próximamente. Para pagar por transferencia con tu banco o app, selecciona la opción "Transferencia Bancaria" a continuación y adjunta tu comprobante.`;
  }

  dismissAlert() {
    this.informationalAlert = null;
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    this.fileError = null;

    if (!input.files || input.files.length === 0) {
      return;
    }

    const file = input.files[0];
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

    if (!allowedTypes.includes(file.type)) {
      this.fileError = 'Solo se admiten comprobantes en formato de imagen JPG, JPEG, PNG o WEBP.';
      this.selectedFile = null;
      this.receiptPreviewUrl = null;
      input.value = '';
      return;
    }

    const maxBytes = 5 * 1024 * 1024; // 5 MB
    if (file.size > maxBytes) {
      this.fileError = `El comprobante no debe superar los 5 MB (tamaño actual: ${(file.size / (1024 * 1024)).toFixed(2)} MB).`;
      this.selectedFile = null;
      this.receiptPreviewUrl = null;
      input.value = '';
      return;
    }

    this.selectedFile = file;

    // Crear preview local
    const reader = new FileReader();
    reader.onload = () => {
      this.receiptPreviewUrl = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  removeReceipt() {
    this.selectedFile = null;
    this.receiptPreviewUrl = null;
    this.fileError = null;
  }

  submitTransferOrder() {
    if (this.isSubmitting) return;

    if (this.cartService.hasUnconfirmedPrices()) {
      this.errorMessage = 'No es posible procesar pedidos con artículos que tienen precio por confirmar.';
      return;
    }

    if (this.cartService.count() === 0) {
      this.errorMessage = 'Tu carrito está vacío.';
      return;
    }

    if (!this.selectedFile) {
      this.fileError = 'Debes adjuntar el comprobante o fotografía de la transferencia bancaria.';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = null;
    this.fileError = null;

    const formData = new FormData();
    formData.append('receipt', this.selectedFile);
    if (this.notes) {
      formData.append('notes', this.notes);
    }
    if (this.selectedBankAccountId) {
      formData.append('bank_account_id', String(this.selectedBankAccountId));
    }

    this.cartService.submitTransferCheckout(formData).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        this.transferResult = res;
        this.createdOrder = res.order;
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMessage = err?.error?.error || 'Error al procesar el pago por transferencia bancaria';
      },
    });
  }

  confirmSimulatedPurchase() {
    if (this.isSubmitting) return;

    if (this.cartService.hasUnconfirmedPrices()) {
      this.errorMessage = 'No es posible procesar compras con artículos que tienen precio por confirmar.';
      return;
    }

    if (this.cartService.count() === 0) {
      this.errorMessage = 'Tu carrito está vacío.';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = null;

    const idempotencyKey = `sim_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    this.cartService.confirmSimulatedPurchase(this.notes, idempotencyKey).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        this.simulatedPurchaseResult = res;
        this.createdOrder = res.order;
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMessage = err?.error?.error || 'Error al procesar la compra simulada';
      },
    });
  }

  submitOrder() {
    if (this.selectedPaymentMethod === 'transferencia') {
      this.submitTransferOrder();
      return;
    }

    if (this.cartService.hasUnconfirmedPrices()) {
      this.errorMessage = 'No es posible procesar pedidos con artículos que tienen precio por confirmar.';
      return;
    }

    if (this.cartService.count() === 0) {
      this.errorMessage = 'Tu carrito está vacío.';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = null;

    this.cartService.createPendingOrder(this.selectedPaymentMethod, this.notes).subscribe({
      next: (order) => {
        this.isSubmitting = false;
        this.createdOrder = order;
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMessage = err?.error?.error || 'Error al registrar el pedido en el sistema';
      },
    });
  }
}
