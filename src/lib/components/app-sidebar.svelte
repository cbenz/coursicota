<script lang="ts">
  import { resolve } from "$app/paths";
  import { page } from "$app/state";
  import BoxesIcon from "@lucide/svelte/icons/boxes";
  import CircleCheckIcon from "@lucide/svelte/icons/circle-check";
  import CircleXIcon from "@lucide/svelte/icons/circle-x";
  import ListIcon from "@lucide/svelte/icons/list";
  import RefreshCcwIcon from "@lucide/svelte/icons/refresh-ccw";
  import ShoppingCartIcon from "@lucide/svelte/icons/shopping-cart";
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";

  interface Props {
    authenticated: boolean;
  }

  type RoutePath = "/products" | "/orders" | "/lists" | "/sync";
  type NavItem = {
    href: RoutePath;
    label: string;
    icon: typeof BoxesIcon;
  };

  let { authenticated }: Props = $props();

  const navItems: NavItem[] = [
    { href: "/products", label: "Products", icon: BoxesIcon },
    { href: "/orders", label: "Orders", icon: ShoppingCartIcon },
    { href: "/lists", label: "Lists", icon: ListIcon },
    { href: "/sync", label: "Sync", icon: RefreshCcwIcon },
  ];
</script>

<Sidebar.Root collapsible="icon">
  <Sidebar.Header>
    <Sidebar.Menu>
      <Sidebar.MenuItem>
        <Sidebar.MenuButton
          size="lg"
          isActive={page.url.pathname === "/"}
        >
          {#snippet child({ props })}
            <a href={resolve("/")} {...props}>
              <div
                class="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg"
              >
                C
              </div>
              <div class="grid flex-1 text-left leading-tight">
                <span class="truncate font-medium">Coursicota</span>
              </div>
            </a>
          {/snippet}
        </Sidebar.MenuButton>
      </Sidebar.MenuItem>
    </Sidebar.Menu>
  </Sidebar.Header>

  <Sidebar.Content>
    <Sidebar.Group>
      <Sidebar.GroupContent>
        <Sidebar.Menu>
          {#each navItems as item (item.href)}
            <Sidebar.MenuItem>
              <Sidebar.MenuButton isActive={page.url.pathname === item.href}>
                {#snippet child({ props })}
                  <a href={resolve(item.href)} {...props}>
                    <item.icon />
                    <span>{item.label}</span>
                  </a>
                {/snippet}
              </Sidebar.MenuButton>
            </Sidebar.MenuItem>
          {/each}
        </Sidebar.Menu>
      </Sidebar.GroupContent>
    </Sidebar.Group>
  </Sidebar.Content>

  <Sidebar.Footer>
    <Sidebar.Menu>
      <Sidebar.MenuItem>
        <Sidebar.MenuButton>
          {#snippet child({ props })}
            <a href={resolve("/sync")} {...props}>
              {#if authenticated}
                <CircleCheckIcon class="text-emerald-600" />
              {:else}
                <CircleXIcon class="text-muted-foreground" />
              {/if}
              <span>{authenticated ? "Session active" : "No session"}</span>
            </a>
          {/snippet}
        </Sidebar.MenuButton>
      </Sidebar.MenuItem>
    </Sidebar.Menu>
  </Sidebar.Footer>

  <Sidebar.Rail />
</Sidebar.Root>
