import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ProductsService, ProductItem } from '../../core/services/products.service';

@Component({
  selector: 'app-products-panel',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './products-panel.component.html',
  styleUrls: ['./settings-panel.scss']
})
export class ProductsPanelComponent implements OnInit {
  private products = inject(ProductsService);
  items = signal<ProductItem[]>([]);
  isLoading = signal(true);
  bannerError = signal<string | null>(null);

  ngOnInit() {
    this.products.getProducts().subscribe({
      next: data => { this.items.set(Array.isArray(data) ? data.slice(0, 20) : []); this.isLoading.set(false); },
      error: err => { this.isLoading.set(false); this.bannerError.set(err.error?.error || 'Failed to load products.'); }
    });
  }
}
