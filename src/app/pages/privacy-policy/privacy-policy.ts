import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SiteFooter } from '../../shared/site-footer/site-footer';

@Component({
  imports: [RouterLink, SiteFooter],
  selector: 'app-privacy-policy',
  styleUrl: './privacy-policy.css',
  templateUrl: './privacy-policy.html',
})
export class PrivacyPolicy {
  readonly version = 'v1.0-2026';
  readonly effectiveDate = '26 de octubre de 2026';
}
