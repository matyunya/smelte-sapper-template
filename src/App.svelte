<script>
  import { Button, Checkbox, Switch } from "smelte";
  export let name;

</script>

<div class="container mx-auto h-full items-center">
  <h1>Hello {name}!</h1>
  <h2>Hello {name}!</h2>
  <h3>Hello {name}!</h3>
  <h4>Hello {name}!</h4>
  <h5>Hello {name}!</h5>
  <h6>Hello {name}!</h6>
  <div class="py-6">
    <Button>Button</Button>
  </div>
  <div class="py-6">
    <Switch label="Switch" />
  </div>
</div>
