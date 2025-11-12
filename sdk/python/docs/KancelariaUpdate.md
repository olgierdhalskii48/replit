# KancelariaUpdate


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**name** | **str** |  | [optional] 
**location** | **str** |  | [optional] 
**specialization** | **str** |  | [optional] 

## Example

```python
from openapi_client.models.kancelaria_update import KancelariaUpdate

# TODO update the JSON string below
json = "{}"
# create an instance of KancelariaUpdate from a JSON string
kancelaria_update_instance = KancelariaUpdate.from_json(json)
# print the JSON string representation of the object
print(KancelariaUpdate.to_json())

# convert the object into a dict
kancelaria_update_dict = kancelaria_update_instance.to_dict()
# create an instance of KancelariaUpdate from a dict
kancelaria_update_from_dict = KancelariaUpdate.from_dict(kancelaria_update_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


