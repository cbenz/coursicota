<script lang="ts">
  import { Badge } from "$lib/components/ui/badge";

  type Props = {
    unavailable?: boolean;
  };

  let { unavailable = false }: Props = $props();
</script>

<Badge variant={unavailable ? "destructive" : "outline"}>
  {unavailable ? "Unavailable" : "Available"}
</Badge>
