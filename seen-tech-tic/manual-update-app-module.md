# Manual Update Instructions for app.module.ts

To fix the profile page routing issue, please update your `app.module.ts` file as follows:

1. Open `frontend/seen-tech-tic/src/app/app.module.ts`.

2. Find the `@NgModule` decorator.

3. In the `declarations` array, add these components if missing:
```typescript
AppComponent,
HeaderComponent,
ProfileComponent
```

4. In the `bootstrap` array, add:
```typescript
AppComponent
```

5. Save the file.

Example snippet:
```typescript
@NgModule({
  declarations: [
    AppComponent,
    HeaderComponent,
    ProfileComponent
  ],
  imports: [
    // existing imports
  ],
  providers: [
    // existing providers
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
```

This will ensure the components are properly declared and bootstrapped.

If you need further help, please let me know.
